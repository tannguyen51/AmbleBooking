const nodemailer = require("nodemailer");

const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || "true") === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    socketTimeout: 20000,
  });
};

const sendMail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are missing");
  }

  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return transporter.sendMail({ from, to, subject, html, text });
};

module.exports = { sendMail };
