import fetch from "node-fetch"; // 如果你的 Node 版本較舊需要這個，Node 18+ 則內建

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export const OpenAiHelper = {
  async chat(messages, options = {}) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY 未設定");

    const body = {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
    };
    if (options.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error?.message || `OpenAI 請求失敗 (${res.status})`);
    }
    return data.choices?.[0]?.message?.content || "";
  }
};