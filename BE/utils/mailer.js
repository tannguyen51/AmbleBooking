const BREVO_API = "https://api.brevo.com/v3/smtp/email";

const sendMail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is missing");
  }

  const fromEmail = process.env.SMTP_FROM || "munchmap.vn@gmail.com";
  const fromName = process.env.BREVO_FROM_NAME || "munchmap";

  const payload = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const res = await fetch(BREVO_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Brevo API error ${res.status}: ${err}`);
    throw new Error(`Brevo API error ${res.status}: ${err}`);
  } else {
    console.log(`✅ Email sent to ${to} via Brevo`);
  }
};

module.exports = { sendMail };
