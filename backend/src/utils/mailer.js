import nodemailer from "nodemailer";

/**
 * 寄送密碼重設信。若未設定 SMTP_HOST 則略過並回傳 false。
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail({ to, resetUrl, username }) {
  const host = process.env.SMTP_HOST;
  if (!host) return false;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER != null && process.env.SMTP_USER !== ""
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
  });

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";

  await transporter.sendMail({
    from,
    to,
    subject: "重設您的 ee-class 密碼",
    text: `您好 ${username}：\n\n請在時效內點擊以下連結重設密碼：\n${resetUrl}\n\n若您未申請重設，請忽略此信。`,
    html: `<p>您好 ${username}：</p><p>請在時效內點擊以下連結重設密碼：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>若您未申請重設，請忽略此信。</p>`,
  });
  return true;
}
