/**
 * 可重用的前端 UI 輔助（純 JS，不依賴 Vue/React）。
 * 其他系統合併時：複製此檔，或 import '@eeclass/bulk-account-import/client'
 *
 * 用法：
 *   const panel = createBulkImportPanel({
 *     mountEl: document.getElementById('bulk-root'),
 *     apiBaseUrl: 'http://127.0.0.1:5000',
 *     importPath: '/api/auth/bulk-register',
 *     templatePath: '/api/auth/bulk-register/template',
 *     getAuthHeaders: () => ({}),
 *     onDone: (result) => console.log(result),
 *   });
 */

export function createBulkImportPanel(options) {
  const {
    mountEl,
    apiBaseUrl = "",
    importPath = "/api/auth/bulk-register",
    templatePath = "/api/auth/bulk-register/template",
    getAuthHeaders = () => ({}),
    getImportCode = null,
    onDone = null,
  } = options;

  if (!mountEl) throw new Error("mountEl 必填");

  mountEl.innerHTML = `
    <div class="bai-panel" style="border:1px dashed #cbd5e1;border-radius:8px;padding:16px;margin-top:20px;background:#f8fafc;">
      <h3 style="margin:0 0 8px;font-size:16px;">Excel 批次建立帳號</h3>
      <p style="margin:0 0 12px;font-size:13px;color:#64748b;line-height:1.5;">
        上傳含帳號資料的 Excel（.xlsx）或 CSV，一鍵建立多個帳號。
        <a href="#" data-bai="download-template">下載樣板</a>
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <label style="font-size:13px;">匯入驗證碼（若伺服器有設定）
          <input data-bai="code" type="password" placeholder="選填 / 依伺服器設定" style="display:block;width:100%;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:4px;" />
        </label>
        <input data-bai="file" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" />
        <button data-bai="submit" type="button" style="align-self:flex-start;background:#337ab7;color:#fff;border:none;border-radius:4px;padding:8px 16px;cursor:pointer;">
          一鍵建立帳號
        </button>
        <pre data-bai="result" style="display:none;margin:0;padding:10px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;font-size:12px;max-height:220px;overflow:auto;white-space:pre-wrap;"></pre>
      </div>
    </div>
  `;

  const fileInput = mountEl.querySelector('[data-bai="file"]');
  const codeInput = mountEl.querySelector('[data-bai="code"]');
  const submitBtn = mountEl.querySelector('[data-bai="submit"]');
  const resultEl = mountEl.querySelector('[data-bai="result"]');
  const templateLink = mountEl.querySelector('[data-bai="download-template"]');

  templateLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const url = `${apiBaseUrl}${templatePath}`;
    window.open(url, "_blank");
  });

  submitBtn.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      alert("請先選擇 Excel / CSV 檔案");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    const code = getImportCode ? getImportCode() : codeInput.value.trim();
    if (code) form.append("importCode", code);

    submitBtn.disabled = true;
    submitBtn.textContent = "建立中…";
    resultEl.style.display = "none";

    try {
      const res = await fetch(`${apiBaseUrl}${importPath}`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      const lines = [
        `成功：${data.summary?.created ?? 0} 筆`,
        `失敗：${data.summary?.failed ?? 0} 筆`,
        "",
        ...(data.results || [])
          .filter((r) => !r.ok)
          .slice(0, 30)
          .map((r) => `列 ${r.rowNumber}${r.username ? ` (${r.username})` : ""}：${r.error}`),
      ];
      resultEl.textContent = lines.join("\n");
      resultEl.style.display = "block";
      alert(data.message || "批次建立完成");
      onDone?.(data);
    } catch (err) {
      alert(err.message || "上傳失敗");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "一鍵建立帳號";
    }
  });

  return {
    destroy() {
      mountEl.innerHTML = "";
    },
  };
}
