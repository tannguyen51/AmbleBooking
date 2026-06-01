const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/user");
const { sendMail } = require("../utils/mailer");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const buildGoogleStateToken = (redirectUri) => {
  return jwt.sign(
    { redirect: redirectUri, type: "google_oauth" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );
};

const getGoogleAppRedirect = (req) => {
  const configured =
    process.env.GOOGLE_APP_REDIRECT || "munchmap://auth/google";
  const requested = req.query.redirect;
  if (!requested) return configured;
  if (configured && requested !== configured) return configured;
  return requested;
};

const buildRedirectUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const buildResetToken = () => {
  // Tạo mã 6 chữ số (000000-999999)
  const rawToken = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");
  return { rawToken, hashedToken };
};

const buildResetLink = (token) => {
  const baseUrl = process.env.APP_RESET_URL || "";
  if (!baseUrl) return "";
  const joiner = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${joiner}token=${token}`;
};

// Register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login.',
      });
    }

    const user = await User.create({ fullName, email, password, phone });
    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      if (user && !user.password) {
        return res.status(401).json({
          success: false,
          message: "Account uses Google login. Please sign in with Google.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    const token = signToken(user._id);

    // Don't send password
    user.password = undefined;

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const { rawToken, hashedToken } = buildResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetLink = buildResetLink(rawToken);
    const subject = "Đặt lại mật khẩu munchmap";
    const text = resetLink
      ? `Mở liên kết để đặt lại mật khẩu: ${resetLink}`
      : `Mã đặt lại mật khẩu: ${rawToken}`;
    const html = resetLink
      ? `<p>Mở liên kết để đặt lại mật khẩu:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Hoặc nhập mã: <strong>${rawToken}</strong></p>`
      : `<p>Mã đặt lại mật khẩu: <strong>${rawToken}</strong></p>`;

    await sendMail({ to: email, subject, text, html });

    return res.status(200).json({
      success: true,
      message: "Reset instructions sent to email.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not send reset email.",
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token is invalid or expired.",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful.",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteRoutes');
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── Google OAuth ─────────────────────────────────────────
exports.googleAuthStart = async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/auth/google/callback";

    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: "Missing GOOGLE_CLIENT_ID",
      });
    }

    const appRedirect = getGoogleAppRedirect(req);
    const state = buildGoogleStateToken(appRedirect);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to start Google login.",
    });
  }
};

exports.googleAuthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(
        buildRedirectUrl(
          process.env.GOOGLE_APP_REDIRECT || "munchmap://auth/google",
          { error },
        ),
      );
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: "Missing code or state",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid state",
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        message: "Missing Google OAuth credentials",
      });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      return res.status(502).json({
        success: false,
        message: "Failed to fetch Google token",
      });
    }

    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    const info = await infoRes.json();

    if (!info.email || info.aud !== clientId) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const email = String(info.email).toLowerCase();
    const fullName = info.name || email.split("@")[0];
    const googleId = info.sub;
    const avatar = info.picture || "";

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        fullName,
        email,
        googleId,
        avatar,
        authProvider: "google",
        role: "customer",
      });
    } else {
      let changed = false;
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        changed = true;
      }
      if (!user.fullName && fullName) {
        user.fullName = fullName;
        changed = true;
      }
      if (!user.authProvider) {
        user.authProvider = "local";
        changed = true;
      }
      if (changed) await user.save();
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    const token = signToken(user._id);
    const redirectUri = decoded?.redirect || getGoogleAppRedirect(req);

    return res.redirect(
      buildRedirectUrl(redirectUri, { token, provider: "google" }),
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Google login failed.",
    });
  }
};