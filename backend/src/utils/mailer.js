import nodemailer from "nodemailer";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      process.env.SMTP_USER != null && process.env.SMTP_USER !== ""
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
        : undefined,
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";
}

/**
 * 寄送密碼重設信。若未設定 SMTP_HOST 則略過並回傳 false。
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail({ to, resetUrl, username }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: "重設您的 ee-class 密碼",
    text: `您好 ${username}：\n\n請在時效內點擊以下連結重設密碼：\n${resetUrl}\n\n若您未申請重設，請忽略此信。`,
    html: `<p>您好 ${escapeHtml(username)}：</p><p>請在時效內點擊以下連結重設密碼：</p><p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p><p>若您未申請重設，請忽略此信。</p>`,
  });
  return true;
}

/**
 * 寄送課程通知信。未設定 SMTP 或沒有收件者時略過，不影響站內通知。
 * @returns {Promise<boolean>}
 */
export async function sendNotificationEmails({ recipients, subject, message, linkPath }) {
  const unique = [...new Set((recipients || []).map((email) => String(email || "").trim()).filter(Boolean))];
  if (!unique.length) return false;

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mail] 未設定 SMTP_HOST，已建立站內通知但未寄信");
    return false;
  }

  const base = String(process.env.APP_PUBLIC_URL || "").replace(/\/$/, "");
  const url = base && linkPath ? `${base}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}` : "";
  const body = message || subject;
  const text = [body, url ? `查看：${url}` : "請登入 ee-class 查看。"].join("\n\n");
  const html = `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>${
    url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>` : "<p>請登入 ee-class 查看。</p>"
  }`;
  const from = getFromAddress();

  await Promise.all(
    unique.map(async (to) => {
      try {
        await transporter.sendMail({ from, to, subject, text, html });
      } catch (error) {
        console.error("[mail] 寄送失敗", to, error?.message || error);
      }
    }),
  );
  return true;
}
