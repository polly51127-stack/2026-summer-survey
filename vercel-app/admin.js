const app = document.querySelector("#app");

const state = {
  passcode: sessionStorage.getItem("summerSurveyAdminPassword") || "",
  config: null,
  draft: null,
  responses: [],
  tab: "questions"
};

const questionTypes = [
  ["text", "簡答題"],
  ["textarea", "長答題"],
  ["select", "下拉式選單"],
  ["radio", "單選題"]
];

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

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.passcode) headers["X-Admin-Password"] = state.passcode;
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.blob();
  if (!response.ok) throw new Error(payload.error || "操作失敗，請稍後再試");
  return payload;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand-mark">威盛保經 夏之約</div>
      <a class="nav-link" href="/">返回問卷</a>
    </header>
  `;
}

function renderLogin(error = "") {
  app.innerHTML = `
    ${renderTopbar()}
    <main class="admin-layout">
      <section class="login-panel">
        <h1>後台管理</h1>
        <form id="loginForm">
          <div class="admin-field">
            <label for="passcode">管理密碼</label>
            <input id="passcode" class="field" type="password" autocomplete="current-password" required />
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">進入後台</button>
          </div>
          ${error ? `<div class="message error">${escapeHtml(error)}</div>` : ""}
        </form>
      </section>
    </main>
  `;
  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    state.passcode = document.querySelector("#passcode").value.trim();
    sessionStorage.setItem("summerSurveyAdminPassword", state.passcode);
    try {
      await loadAdminData();
    } catch (loadError) {
      sessionStorage.removeItem("summerSurveyAdminPassword");
      state.passcode = "";
      renderLogin(loadError.message);
    }
  });
}

async function loadAdminData() {
  const payload = await api("/api/admin/responses");
  state.responses = payload.responses || [];
  state.config = payload.config;
  state.draft = structuredClone(state.config);
  renderAdmin();
}

function renderAdmin(message = "") {
  app.innerHTML = `
    ${renderTopbar()}
    <main class="admin-layout">
      <div class="admin-header">
        <div>
          <h1>後台管理</h1>
          <p>目前共 ${state.responses.length} 份回覆</p>
        </div>
        <button class="ghost-button" id="logoutButton">登出後台</button>
      </div>
      <div class="admin-tabs">
        <button class="tab-button ${state.tab === "questions" ? "active" : ""}" data-tab="questions">題目設定</button>
        <button class="tab-button ${state.tab === "responses" ? "active" : ""}" data-tab="responses">回覆與匯出</button>
      </div>
      ${message}
      ${state.tab === "questions" ? renderQuestionEditor() : renderResponses()}
    </main>
  `;
  document.querySelector("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("summerSurveyAdminPassword");
    state.passcode = "";
    renderLogin();
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      collectDraftFromDom();
      state.tab = button.dataset.tab;
      renderAdmin();
    });
  });
  if (state.tab === "questions") bindQuestionEditor();
  if (state.tab === "responses") bindResponseTools();
}

function renderQuestionEditor() {
  const config = state.draft || state.config;
  return `
    <section class="admin-panel">
      <div class="admin-form-grid">
        <div class="admin-field">
          <label for="titleInput">問卷標題</label>
          <input id="titleInput" class="field" value="${escapeHtml(config.title)}" />
        </div>
        <div class="admin-field">
          <label for="descriptionInput">說明文字</label>
          <textarea id="descriptionInput" class="textarea">${escapeHtml(config.description)}</textarea>
        </div>
        <div class="admin-field">
          <label for="successInput">送出後訊息</label>
          <input id="successInput" class="field" value="${escapeHtml(config.successMessage)}" />
        </div>
      </div>
      <div id="questionEditors">
        ${config.questions.map(renderQuestionEditorItem).join("")}
      </div>
      <div class="form-actions">
        <button class="ghost-button" id="addQuestionButton" type="button">新增問題</button>
        <button class="primary-button" id="saveConfigButton" type="button">儲存設定</button>
      </div>
      <div id="adminMessage"></div>
    </section>
  `;
}

function renderQuestionEditorItem(question, index) {
  const typeOptions = questionTypes
    .map(([value, label]) => `<option value="${value}" ${question.type === value ? "selected" : ""}>${label}</option>`)
    .join("");
  const showOptions = ["select", "radio"].includes(question.type);
  return `
    <article class="question-editor" data-index="${index}" data-id="${escapeHtml(question.id)}">
      <div class="question-editor-header">
        <div class="question-editor-title">問題 ${index + 1}</div>
        <div class="editor-actions">
          <button class="ghost-button move-up" type="button" ${index === 0 ? "disabled" : ""}>上移</button>
          <button class="ghost-button move-down" type="button" ${index === state.draft.questions.length - 1 ? "disabled" : ""}>下移</button>
          <button class="danger-button delete-question" type="button">刪除</button>
        </div>
      </div>
      <div class="editor-grid">
        <div class="editor-field">
          <label>題目內容</label>
          <textarea class="textarea question-label-input">${escapeHtml(question.label)}</textarea>
        </div>
        <div class="editor-field">
          <label>題型</label>
          <select class="select question-type-input">${typeOptions}</select>
        </div>
        <div class="editor-field">
          <label>設定</label>
          <label class="checkbox-row">
            <input class="question-required-input" type="checkbox" ${question.required ? "checked" : ""} />
            必填
          </label>
        </div>
      </div>
      <div class="editor-field option-editor" style="${showOptions ? "" : "display:none"}">
        <label>選項內容，每行一個選項</label>
        <textarea class="textarea question-options-input">${escapeHtml((question.options || []).join("\n"))}</textarea>
      </div>
    </article>
  `;
}

function bindQuestionEditor() {
  document.querySelector("#addQuestionButton").addEventListener("click", () => {
    collectDraftFromDom();
    state.draft.questions.push({
      id: `q_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`,
      label: "新增問題",
      type: "text",
      required: false,
      options: []
    });
    renderAdmin();
  });
  document.querySelector("#saveConfigButton").addEventListener("click", saveConfig);
  document.querySelectorAll(".question-type-input").forEach((select) => {
    select.addEventListener("change", (event) => {
      const editor = event.currentTarget.closest(".question-editor");
      editor.querySelector(".option-editor").style.display = ["select", "radio"].includes(event.currentTarget.value)
        ? ""
        : "none";
    });
  });
  document.querySelectorAll(".move-up").forEach((button) => button.addEventListener("click", () => moveQuestion(button, -1)));
  document.querySelectorAll(".move-down").forEach((button) => button.addEventListener("click", () => moveQuestion(button, 1)));
  document.querySelectorAll(".delete-question").forEach((button) => {
    button.addEventListener("click", () => {
      collectDraftFromDom();
      state.draft.questions.splice(Number(button.closest(".question-editor").dataset.index), 1);
      renderAdmin();
    });
  });
}

function collectDraftFromDom() {
  const titleInput = document.querySelector("#titleInput");
  if (!titleInput) return;
  state.draft = {
    title: titleInput.value.trim(),
    description: document.querySelector("#descriptionInput").value.trim(),
    successMessage: document.querySelector("#successInput").value.trim(),
    questions: [...document.querySelectorAll(".question-editor")].map((editor) => {
      const type = editor.querySelector(".question-type-input").value;
      const optionsText = editor.querySelector(".question-options-input")?.value || "";
      return {
        id: editor.dataset.id,
        label: editor.querySelector(".question-label-input").value.trim(),
        type,
        required: editor.querySelector(".question-required-input").checked,
        options: ["select", "radio"].includes(type)
          ? optionsText.split("\n").map((line) => line.trim()).filter(Boolean)
          : []
      };
    })
  };
}

function moveQuestion(button, direction) {
  collectDraftFromDom();
  const index = Number(button.closest(".question-editor").dataset.index);
  const next = index + direction;
  if (next < 0 || next >= state.draft.questions.length) return;
  const [item] = state.draft.questions.splice(index, 1);
  state.draft.questions.splice(next, 0, item);
  renderAdmin();
}

async function saveConfig() {
  const message = document.querySelector("#adminMessage");
  collectDraftFromDom();
  message.innerHTML = "";
  try {
    const result = await api("/api/admin/config", {
      method: "PUT",
      body: JSON.stringify(state.draft)
    });
    state.config = result.config;
    state.draft = structuredClone(result.config);
    renderAdmin(`<div class="message success">設定已儲存。</div>`);
  } catch (error) {
    message.innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
  }
}

function renderResponses() {
  const rows = state.responses
    .map((response) => {
      const cells = state.config.questions
        .slice(0, 5)
        .map((question) => `<td>${textToHtml(response.answers?.[question.id] || "")}</td>`)
        .join("");
      return `
        <tr>
          <td>${escapeHtml(new Date(response.submittedAt).toLocaleString("zh-TW"))}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  return `
    <section class="admin-panel">
      <div class="response-tools">
        <strong>回覆資料：${state.responses.length} 份</strong>
        <div class="tool-buttons">
          <button class="ghost-button" data-download="xlsx" type="button">下載試算表</button>
          <button class="ghost-button" data-download="csv" type="button">下載 CSV</button>
          <button class="ghost-button" data-download="json" type="button">下載 JSON</button>
          <button class="primary-button" id="printReport" type="button">列印/另存 PDF</button>
          <button class="ghost-button" id="refreshResponses" type="button">重新整理</button>
        </div>
      </div>
      ${
        state.responses.length
          ? `
            <div class="table-wrap">
              <table class="response-table">
                <thead>
                  <tr>
                    <th>送出時間</th>
                    ${state.config.questions.slice(0, 5).map((question) => `<th>${escapeHtml(question.label)}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `
          : `<div class="empty-state">目前尚無回覆。</div>`
      }
    </section>
  `;
}

function bindResponseTools() {
  document.querySelector("#refreshResponses")?.addEventListener("click", loadAdminData);
  document.querySelector("#printReport")?.addEventListener("click", () => window.open("/print.html", "_blank"));
  document.querySelectorAll("[data-download]").forEach((button) => {
    button.addEventListener("click", () => downloadExport(button.dataset.download));
  });
}

async function downloadExport(format) {
  const filenames = {
    xlsx: "2026夏之約問卷回覆.xlsx",
    csv: "2026夏之約問卷回覆.csv",
    json: "2026夏之約問卷回覆.json"
  };
  const response = await fetch(`/api/admin/export?format=${encodeURIComponent(format)}`, {
    headers: { "X-Admin-Password": state.passcode }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    renderAdmin(`<div class="message error">${escapeHtml(payload.error || "下載失敗")}</div>`);
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenames[format] || "問卷回覆";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function boot() {
  if (state.passcode) {
    loadAdminData().catch(() => renderLogin());
  } else {
    renderLogin();
  }
}

boot();
