const app = document.querySelector("#app");

let config = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "操作失敗，請稍後再試");
  return payload;
}

function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand-mark">威盛保經 夏之約</div>
      <a class="nav-link" href="/admin.html">後台管理</a>
    </header>
  `;
}

function renderHero() {
  return `
    <section class="hero">
      <div class="hero-content">
        <p class="hero-kicker">VIA Summer Gathering Survey</p>
        <h1>${escapeHtml(config.title)}</h1>
        <p class="hero-description">${escapeHtml(config.description)}</p>
      </div>
    </section>
  `;
}

function renderQuestion(question, index) {
  const required = question.required ? `<span class="required">必填</span>` : "";
  const id = `answer_${question.id}`;
  let field = "";

  if (question.type === "text") {
    field = `<input id="${id}" class="field" name="${question.id}" type="text" ${question.required ? "required" : ""} />`;
  }
  if (question.type === "textarea") {
    field = `<textarea id="${id}" class="textarea" name="${question.id}" ${question.required ? "required" : ""}></textarea>`;
  }
  if (question.type === "select") {
    field = `
      <select id="${id}" class="select" name="${question.id}" ${question.required ? "required" : ""}>
        <option value="">請選擇</option>
        ${question.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}
      </select>
    `;
  }
  if (question.type === "radio") {
    field = `
      <div class="option-list">
        ${question.options
          .map((option, optionIndex) => {
            const optionId = `${id}_${optionIndex}`;
            return `
              <label class="radio-option" for="${optionId}">
                <input id="${optionId}" type="radio" name="${question.id}" value="${escapeHtml(option)}" ${question.required ? "required" : ""} />
                <span>${escapeHtml(option)}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    `;
  }

  return `
    <section class="question">
      <label class="question-label" for="${id}">${index + 1}. ${escapeHtml(question.label)}${required}</label>
      ${field}
    </section>
  `;
}

function renderSurvey() {
  app.innerHTML = `
    ${renderTopbar()}
    ${renderHero()}
    <main class="main-layout">
      <div class="survey-grid">
        <form id="surveyForm" class="survey-form">
          ${config.questions.map(renderQuestion).join("")}
          <div class="form-actions">
            <button type="submit" class="primary-button">送出問卷</button>
          </div>
          <div id="surveyMessage"></div>
        </form>
        <aside class="survey-aside">
          <strong>您的回饋很重要</strong>
          這份問卷不用登入即可填寫。請依照活動當天的真實感受作答，協助未來活動安排得更貼近夥伴需求。
        </aside>
      </div>
    </main>
  `;
  document.querySelector("#surveyForm").addEventListener("submit", submitSurvey);
}

async function submitSurvey(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const answers = {};
  config.questions.forEach((question) => {
    answers[question.id] = String(data.get(question.id) || "").trim();
  });
  const button = form.querySelector("button[type='submit']");
  const message = document.querySelector("#surveyMessage");
  button.disabled = true;
  button.textContent = "送出中...";
  message.innerHTML = "";

  try {
    const result = await api("/api/responses", {
      method: "POST",
      body: JSON.stringify({ answers })
    });
    app.innerHTML = `
      ${renderTopbar()}
      <main class="main-layout">
        <section class="success-panel">
          <h2>${escapeHtml(result.message || config.successMessage)}</h2>
          <p>您的回覆已成功送出。</p>
          <button class="primary-button" id="newResponseButton">再填一份</button>
        </section>
      </main>
    `;
    document.querySelector("#newResponseButton").addEventListener("click", renderSurvey);
  } catch (error) {
    message.innerHTML = `<div class="message error">${escapeHtml(error.message)}</div>`;
    button.disabled = false;
    button.textContent = "送出問卷";
  }
}

async function boot() {
  try {
    config = await api("/api/config");
    renderSurvey();
  } catch (error) {
    app.innerHTML = `<div class="loading-panel message error">${escapeHtml(error.message)}</div>`;
  }
}

boot();
