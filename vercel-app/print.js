const root = document.querySelector("#printRoot");
const passcode = sessionStorage.getItem("summerSurveyAdminPassword") || "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

async function boot() {
  if (!passcode) {
    root.innerHTML = `<div class="message error">請先登入後台，再開啟列印報表。</div>`;
    return;
  }
  const response = await fetch("/api/admin/responses", {
    headers: { "X-Admin-Password": passcode }
  });
  const payload = await response.json();
  if (!response.ok) {
    root.innerHTML = `<div class="message error">${escapeHtml(payload.error || "無法載入報表")}</div>`;
    return;
  }
  const { config, responses } = payload;
  root.innerHTML = `
    <div class="no-print form-actions">
      <button class="primary-button" id="printButton">列印/另存 PDF</button>
    </div>
    <h1>${escapeHtml(config.title)}</h1>
    <p>產生時間：${escapeHtml(new Date().toLocaleString("zh-TW"))}</p>
    <p>總回覆數：${responses.length}</p>
    ${
      responses.length
        ? responses.map((response, index) => renderResponse(config, response, index)).join("")
        : `<div class="empty-state">目前尚無回覆。</div>`
    }
  `;
  document.querySelector("#printButton").addEventListener("click", () => window.print());
}

function renderResponse(config, response, index) {
  const rows = config.questions
    .map((question) => {
      const answer = response.answers?.[question.id] || "";
      return `
        <tr>
          <th>${escapeHtml(question.label)}</th>
          <td>${textToHtml(answer)}</td>
        </tr>
      `;
    })
    .join("");
  return `
    <section class="print-response">
      <h2>第 ${index + 1} 份回覆</h2>
      <p>${escapeHtml(new Date(response.submittedAt).toLocaleString("zh-TW"))}</p>
      <table class="response-table">
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

boot();
