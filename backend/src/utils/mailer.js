import nodemailer from "nodemailer";

const SYSTEM_NAME = "國立中央大學「LMS 計畫」";
const SUBJECT_TAG = "【LMS 計畫通知】";

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
  const address = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@localhost";
  return { name: SYSTEM_NAME, address };
}

function formatNow() {
  return new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false });
}

/**
 * 組出正式通知信（HTML 與純文字兩種版本）。
 * 版面用 table 與 inline style，避免郵件軟體不支援外部樣式。
 */
function renderLetter({ heading, greeting, intro, rows = [], body = "", actionUrl = "", actionLabel = "前往查看", notes = [] }) {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="width:96px;padding:8px 12px;background:#f3f5f8;border:1px solid #dde2e8;color:#4a5568;font-weight:bold;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border:1px solid #dde2e8;color:#1a202c;">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const bodyHtml = body
    ? `<div style="margin:20px 0;padding:16px 18px;border-left:4px solid #1f3a68;background:#f8f9fb;color:#1a202c;line-height:1.8;">${escapeHtml(body).replace(/\n/g, "<br>")}</div>`
    : "";

  const actionHtml = actionUrl
    ? `<p style="margin:24px 0 8px;text-align:center;">
         <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:10px 28px;background:#1f3a68;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">${escapeHtml(actionLabel)}</a>
       </p>
       <p style="margin:0 0 8px;font-size:12px;color:#718096;text-align:center;word-break:break-all;">若按鈕無法開啟，請複製以下網址至瀏覽器：<br>${escapeHtml(actionUrl)}</p>`
    : `<p style="margin:20px 0 8px;color:#4a5568;">請登入${escapeHtml(SYSTEM_NAME)}查看詳細內容。</p>`;

  const notesHtml = notes.map((note) => `<p style="margin:12px 0 0;color:#4a5568;line-height:1.7;">${escapeHtml(note)}</p>`).join("");

  const html = `<!doctype html>
<html lang="zh-Hant">
<body style="margin:0;padding:0;background:#eef1f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #d5dbe3;font-family:'Microsoft JhengHei','PingFang TC','Noto Sans TC',Arial,sans-serif;font-size:15px;">
        <tr><td style="background:#1f3a68;padding:18px 28px;color:#ffffff;">
          <div style="font-size:18px;font-weight:bold;letter-spacing:1px;">${escapeHtml(SYSTEM_NAME)}</div>
          <div style="margin-top:4px;font-size:13px;color:#c8d3e6;">${escapeHtml(heading)}</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px;color:#1a202c;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 16px;color:#1a202c;line-height:1.7;">${escapeHtml(intro)}</p>
          ${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">${rowsHtml}</table>` : ""}
          ${bodyHtml}
          ${actionHtml}
          ${notesHtml}
          <p style="margin:28px 0 0;color:#1a202c;">${escapeHtml(SYSTEM_NAME)} 敬上</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f3f5f8;border-top:1px solid #dde2e8;font-size:12px;color:#718096;line-height:1.7;">
          本信件由系統自動發送，請勿直接回覆。<br>
          若您對本通知內容有疑問，請洽課程授課教師或助教。
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `${SYSTEM_NAME}｜${heading}`,
    "",
    greeting,
    "",
    intro,
    "",
    ...rows.map(([label, value]) => `${label}：${value}`),
    ...(body ? ["", "──────────", body, "──────────"] : []),
    "",
    actionUrl ? `${actionLabel}：${actionUrl}` : `請登入${SYSTEM_NAME}查看詳細內容。`,
    ...notes.flatMap((note) => ["", note]),
    "",
    `${SYSTEM_NAME} 敬上`,
    "",
    "※ 本信件由系統自動發送，請勿直接回覆。若您對本通知內容有疑問，請洽課程授課教師或助教。",
  ].join("\n");

  return { html, text };
}

/**
 * 寄送密碼重設信。若未設定 SMTP_HOST 則略過並回傳 false。
 * @returns {Promise<boolean>}
 */
export async function sendPasswordResetEmail({ to, resetUrl, username }) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const { html, text } = renderLetter({
    heading: "帳號安全通知",
    greeting: `${username} 您好：`,
    intro: "本系統於近期收到您帳號的密碼重設申請，請於連結有效期限內點選下方按鈕完成密碼重設。",
    rows: [
      ["帳號", username],
      ["申請時間", formatNow()],
    ],
    actionUrl: resetUrl,
    actionLabel: "重設密碼",
    notes: ["若您並未提出此申請，請忽略本信件，您的密碼將維持不變。為保障帳號安全，請勿將此連結轉寄他人。"],
  });

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject: `${SUBJECT_TAG}密碼重設申請`,
    text,
    html,
  });
  return true;
}

/**
 * 寄送課程通知信。未設定 SMTP 或沒有收件者時略過，不影響站內通知。
 * courseName / headline 有傳入時會放進信件的資訊表格，否則只用 subject。
 * @returns {Promise<boolean>}
 */
export async function sendNotificationEmails({ recipients, subject, message, linkPath, courseName = "", headline = "" }) {
  const unique = [...new Set((recipients || []).map((email) => String(email || "").trim()).filter(Boolean))];
  if (!unique.length) return false;

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mail] 未設定 SMTP_HOST，已建立站內通知但未寄信");
    return false;
  }

  const base = String(process.env.APP_PUBLIC_URL || "").replace(/\/$/, "");
  const url = base && linkPath ? `${base}${linkPath.startsWith("/") ? linkPath : `/${linkPath}`}` : "";
  const title = headline || subject;
  // 內文與主旨相同時不重複顯示
  const body = message && message !== subject && message !== title ? message : "";

  const { html, text } = renderLetter({
    heading: "課程通知",
    greeting: "您好：",
    intro: courseName ? `您所參與的課程「${courseName}」有一則新通知，內容如下：` : "您有一則新的課程通知，內容如下：",
    rows: [
      ...(courseName ? [["課程名稱", courseName]] : []),
      ["通知事項", title],
      ["通知時間", formatNow()],
    ],
    body,
    actionUrl: url,
    actionLabel: "前往查看",
  });
  const from = getFromAddress();
  const fullSubject = `${SUBJECT_TAG}${subject}`;

  await Promise.all(
    unique.map(async (to) => {
      try {
        await transporter.sendMail({ from, to, subject: fullSubject, text, html });
      } catch (error) {
        console.error("[mail] 寄送失敗", to, error?.message || error);
      }
    }),
  );
  return true;
}
