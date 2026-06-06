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
  const configured = process.env.GOOGLE_APP_REDIRECT; // không fallback cứng
  const requested = req.query.redirect;
  // Nếu không có env cấu hình, dùng redirect từ app (hỗ trợ Expo Go dev scheme)
  if (!configured) return requested || "munchmap://auth/google";
  // Nếu có cấu hình rõ ràng, ưu tiên dùng nó (bảo mật)
  return configured;
};

const buildRedirectUrl = (baseUrl, params) => {
  // Dùng cách thủ công thay vì new URL() để tránh lỗi với custom scheme (munchmap://)
  const queryEntries = Object.entries(params).filter(([, v]) => v);
  if (queryEntries.length === 0) return baseUrl;
  const qs = queryEntries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  const sep = baseUrl.includes("?") ? "&" : "?";
  return baseUrl + sep + qs;
};

// Trả về HTML page với deep link về app (thay vì 302 redirect — iOS chặn redirect custom scheme)
const sendAppRedirect = (req, res, deepLink, isError = false) => {
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  // iOS Safari chặn 302 redirect tới custom scheme → cần HTML page có user click
  // Android Chrome xử lý 302 redirect tốt hơn
  const isIOS = /iphone|ipad|ipod/.test(ua);

  if (!isIOS) {
    // Android / desktop: dùng 302 redirect
    return res.redirect(302, deepLink);
  }

  // iOS: HTML page với nút bấm
  const escapedLink = String(deepLink).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const rawLink = String(deepLink);
  const title = isError ? "Đăng nhập thất bại" : "Đăng nhập thành công";
  const msg = isError
    ? "Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ."
    : "Bạn có thể quay lại ứng dụng để tiếp tục.";
  const icon = isError ? "&#10060;" : "&#9989;";

  res.send(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - MunchMap</title>
<style>
  body{font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;text-align:center;padding:20px}
  .card{background:#fff;border-radius:16px;padding:40px 24px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:400px;width:100%}
  .icon{font-size:64px;margin-bottom:16px}
  h1{font-size:20px;color:#1a1a1a;margin:0 0 8px}
  p{font-size:14px;color:#6b7280;margin:0 0 24px}
  .btn{display:inline-block;background:#ff6b35;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px}
  .btn:hover{background:#e55a2b}
  .btn:active{background:#cc5522}
  .hint{font-size:12px;color:#9ca3af;margin-top:12px}
</style>
</head>
<body>
<div class="card">
<div class="icon">${icon}</div>
<h1>${title}</h1>
<p>${msg}</p>
<a class="btn" href="${escapedLink}" id="backBtn">Quay lại ứng dụng</a>
<p class="hint">Bấm nút trên để mở ứng dụng</p>
</body>
</html>`);
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
    console.log(`✅ Reset email sent to ${email}`);

    return res.status(200).json({
      success: true,
      message: "Reset instructions sent to email.",
    });
  } catch (error) {
    console.error("❌ sendResetEmail error:", error?.message || error);
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

    // UA detection: iOS → HTML page, Android → 302 redirect
    const redirectWithError = (msg) =>
      sendAppRedirect(
        req,
        res,
        buildRedirectUrl(getGoogleAppRedirect(req), { error: msg }),
        true,
      );

    if (error) {
      return redirectWithError(error);
    }

    if (!code || !state) {
      return redirectWithError("missing_code_or_state");
    }

    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return redirectWithError("invalid_state");
    }

    const redirectUri = decoded?.redirect || getGoogleAppRedirect(req);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl =
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      return redirectWithError("missing_google_credentials");
    }

    // Timeout 15 giây cho Google API calls
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let tokenData;
    try {
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
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      tokenData = await tokenRes.json();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error("[googleAuthCallback] Token exchange error:", fetchErr?.message || fetchErr);
      return redirectWithError("google_api_timeout");
    }

    const idToken = tokenData.id_token;

    if (!idToken) {
      console.error("[googleAuthCallback] Token exchange failed:", tokenData.error, tokenData.error_description);
      return redirectWithError("google_token_failed");
    }

    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    const info = await infoRes.json();

    if (!info.email || info.aud !== clientId) {
      return redirectWithError("invalid_google_token");
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
      return redirectWithError("account_deactivated");
    }

    const token = signToken(user._id);

    return sendAppRedirect(
      req,
      res,
      buildRedirectUrl(redirectUri, { token, provider: "google" }),
      false,
    );
  } catch (error) {
    console.error("[googleAuthCallback]", error?.message || error);
    return sendAppRedirect(
      req,
      res,
      buildRedirectUrl(getGoogleAppRedirect(req), { error: "google_login_failed" }),
      true,
    );
  }
};