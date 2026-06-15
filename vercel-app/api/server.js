const crypto = require("crypto");
const { Pool } = require("pg");
const JSZip = require("jszip");

const DEFAULT_CONFIG = {
  title: "2026夏之約滿意度調查",
  description:
    "各位夥伴大家好，\n隨著夏之約圓滿落幕，相信您已經吸收滿滿的知識。感謝您的參與，讓這趟學習之旅充滿了歡樂與溫暖的回憶。\n\n為了讓公司未來的活動能更臻完美，誠摯邀請您分享這次學習後的真實感受與建議。您的每一份意見，都是我們進步的動力。",
  successMessage: "感謝您的填寫！",
  questions: [
    {
      id: "office",
      label: "營業處",
      type: "select",
      required: true,
      options: [
        "北一營業處",
        "北三營業處",
        "北九營業處",
        "北二營業處",
        "北二共榮營業處",
        "北七營業處",
        "北十勝揚營業處",
        "北五營業處",
        "北六營業處",
        "北八營業處",
        "雄一桃園分處",
        "中一營業處",
        "中二營業處",
        "花一草屯分處",
        "雲一營業處",
        "嘉二營業處",
        "南一營業處",
        "南二營業處",
        "雄一營業處",
        "雄三營業處",
        "雄五營業處",
        "雄八營業處",
        "雄九營業處",
        "屏一營業處",
        "花一營業處",
        "蘭陽營業處",
        "宜二營業處",
        "雄九台東分處",
        "宜二台東分處"
      ]
    },
    { id: "name", label: "姓名", type: "text", required: true, options: [] },
    {
      id: "q3",
      label: "『親密搶奪，誰在拿走你的錢. 講師 | 作家 高愛倫』內容安排如何？",
      type: "radio",
      required: true,
      options: ["都很好很豐富", "剛好是我要的", "我覺得想學得更多"]
    },
    {
      id: "q3_1",
      label: "『親密搶奪，誰在拿走你的錢. 講師 | 作家 高愛倫』 印象最深刻的部分有哪些？",
      type: "textarea",
      required: false,
      options: []
    },
    {
      id: "q4",
      label: "『照顧長輩，就是照顧未來的自己.  講師 | 作家 吳若權』內容安排如何？",
      type: "radio",
      required: true,
      options: ["都很好很豐富", "剛好是我要的", "我覺得想學得更多"]
    },
    {
      id: "q4_1",
      label: "『照顧長輩，就是照顧未來的自己  講師 | 作家 吳若權』 印象最深刻的部分有哪些？",
      type: "textarea",
      required: false,
      options: []
    },
    {
      id: "q5",
      label: "『前進義大利！數位兵法助你插旗高峰會！.  講師 |陳佑俊 協理』內容安排如何？",
      type: "radio",
      required: true,
      options: ["都很好很豐富", "剛好是我要的", "我覺得想學得更多"]
    },
    {
      id: "q5_1",
      label: "『前進義大利！數位兵法助你插旗高峰會！.  講師 |陳佑俊 協理』 印象最深刻的部分有哪些？",
      type: "textarea",
      required: false,
      options: []
    },
    {
      id: "q6",
      label: "『如何「借力使力」啟動團隊行銷超能力. 講師|張正龍 協理』內容安排如何？",
      type: "radio",
      required: true,
      options: ["都很好很豐富", "剛好是我要的", "我覺得想學得更多"]
    },
    {
      id: "q6_1",
      label: "『如何「借力使力」啟動團隊行銷超能力. 講師|張正龍 協理』印象最深刻的部分有哪些？",
      type: "textarea",
      required: false,
      options: []
    },
    {
      id: "q7",
      label: "哪一個課程內容安排讓您印象最深刻? 為什麼？",
      type: "textarea",
      required: true,
      options: []
    },
    {
      id: "q8",
      label: "哪一個課程對您個人在未來工作上最有幫助？為什麼？",
      type: "textarea",
      required: true,
      options: []
    },
    {
      id: "q9",
      label: "哪一個課程對您個人在未來工作上最有幫助？為什麼？",
      type: "textarea",
      required: false,
      options: []
    }
  ]
};

let pool;
let initialized = false;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 尚未設定。請先在 Vercel 專案連接 Postgres 資料庫。");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureDatabase() {
  if (initialized) return;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS survey_config (
      id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id TEXT PRIMARY KEY,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      answers JSONB NOT NULL
    );
  `);
  await db.query(
    `INSERT INTO survey_config (id, config)
     VALUES ('active', $1::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(DEFAULT_CONFIG)]
  );
  initialized = true;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function sendBuffer(res, contentType, filename, buffer) {
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader("Cache-Control", "no-store");
  res.end(buffer);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  const actual = req.headers["x-admin-password"] || "";
  if (!expected) throw new Error("ADMIN_PASSWORD 尚未設定。請先在 Vercel 環境變數設定後台密碼。");
  return actual === expected;
}

function requireAdmin(req) {
  if (!isAdmin(req)) {
    const error = new Error("後台密碼不正確");
    error.statusCode = 401;
    throw error;
  }
}

async function getConfig() {
  await ensureDatabase();
  const result = await getPool().query("SELECT config FROM survey_config WHERE id = 'active'");
  return result.rows[0]?.config || DEFAULT_CONFIG;
}

async function saveConfig(config) {
  await ensureDatabase();
  await getPool().query(
    `UPDATE survey_config SET config = $1::jsonb, updated_at = NOW() WHERE id = 'active'`,
    [JSON.stringify(config)]
  );
  return getConfig();
}

async function getResponses() {
  await ensureDatabase();
  const result = await getPool().query(
    "SELECT id, submitted_at, answers FROM survey_responses ORDER BY submitted_at DESC"
  );
  return result.rows.map((row) => ({
    id: row.id,
    submittedAt: row.submitted_at,
    answers: row.answers || {}
  }));
}

function sanitizeConfig(raw) {
  const allowedTypes = new Set(["text", "textarea", "select", "radio"]);
  if (!raw || typeof raw !== "object") throw new Error("設定格式不正確");
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new Error("至少需要一個問題");
  }
  const seen = new Set();
  const questions = raw.questions.map((question, index) => {
    const label = String(question.label || "").trim();
    const type = String(question.type || "").trim();
    if (!label) throw new Error(`第 ${index + 1} 題缺少題目文字`);
    if (!allowedTypes.has(type)) throw new Error(`第 ${index + 1} 題的題型不支援`);
    let id = String(question.id || "").trim();
    if (!id || seen.has(id)) id = `q_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    seen.add(id);
    const options = Array.isArray(question.options)
      ? question.options.map((option) => String(option).trim()).filter(Boolean)
      : [];
    if ((type === "select" || type === "radio") && options.length === 0) {
      throw new Error(`第 ${index + 1} 題需要至少一個選項`);
    }
    return {
      id,
      label,
      type,
      required: Boolean(question.required),
      options: type === "select" || type === "radio" ? options : []
    };
  });
  return {
    title: String(raw.title || "問卷調查").trim() || "問卷調查",
    description: String(raw.description || "").trim(),
    successMessage: String(raw.successMessage || "感謝您的填寫！").trim() || "感謝您的填寫！",
    questions
  };
}

function validateAnswers(config, raw) {
  const answers = raw && typeof raw === "object" ? raw.answers || raw : {};
  const clean = {};
  const errors = [];
  for (const question of config.questions || []) {
    const value = String(answers[question.id] || "").trim().slice(0, 5000);
    if (question.required && !value) {
      errors.push(`${question.label} 為必填`);
      continue;
    }
    if (value && ["select", "radio"].includes(question.type) && !question.options.includes(value)) {
      errors.push(`${question.label} 的選項不正確`);
      continue;
    }
    clean[question.id] = value;
  }
  if (errors.length) throw new Error(errors.join("；"));
  return clean;
}

function rowsForExport(config, responses) {
  const questions = config.questions || [];
  const rows = [["回覆編號", "送出時間", ...questions.map((question) => question.label)]];
  for (const response of responses) {
    rows.push([
      response.id,
      formatDate(response.submittedAt),
      ...questions.map((question) => String(response.answers?.[question.id] || ""))
    ]);
  }
  return rows;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function makeCsv(rows) {
  return Buffer.from("\ufeff" + rows.map((row) => row.map(csvEscape).join(",")).join("\r\n"), "utf8");
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function excelColumn(index) {
  let letters = "";
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    index = Math.floor((index - 1) / 26);
  }
  return letters;
}

async function makeXlsx(rows, title) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${excelColumn(colIndex + 1)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="問卷回覆" sheetId="1" r:id="rId1"/></sheets></workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
  );
  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`
  );
  zip.file(
    "docProps/app.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>2026夏之約問卷系統</Application></Properties>`
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function handleExport(req, res, config, responses, url) {
  const rows = rowsForExport(config, responses);
  const format = url.searchParams.get("format") || "xlsx";
  if (format === "csv") {
    sendBuffer(res, "text/csv; charset=utf-8", "2026夏之約問卷回覆.csv", makeCsv(rows));
    return;
  }
  if (format === "json") {
    sendBuffer(
      res,
      "application/json; charset=utf-8",
      "2026夏之約問卷回覆.json",
      Buffer.from(JSON.stringify({ config, responses }, null, 2), "utf8")
    );
    return;
  }
  const xlsx = await makeXlsx(rows, config.title || "問卷回覆");
  sendBuffer(
    res,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "2026夏之約問卷回覆.xlsx",
    xlsx
  );
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/^\/api/, "") || "/";
  try {
    if (req.method === "GET" && pathname === "/config") {
      json(res, 200, await getConfig());
      return;
    }

    if (req.method === "POST" && pathname === "/responses") {
      const config = await getConfig();
      const answers = validateAnswers(config, await readBody(req));
      const id = crypto.randomUUID();
      await getPool().query(
        "INSERT INTO survey_responses (id, answers) VALUES ($1, $2::jsonb)",
        [id, JSON.stringify(answers)]
      );
      json(res, 201, { ok: true, message: config.successMessage || "感謝您的填寫！" });
      return;
    }

    if (req.method === "GET" && pathname === "/admin/responses") {
      requireAdmin(req);
      const [config, responses] = await Promise.all([getConfig(), getResponses()]);
      json(res, 200, { config, responses });
      return;
    }

    if (req.method === "PUT" && pathname === "/admin/config") {
      requireAdmin(req);
      const config = sanitizeConfig(await readBody(req));
      json(res, 200, { ok: true, config: await saveConfig(config) });
      return;
    }

    if (req.method === "GET" && pathname === "/admin/export") {
      requireAdmin(req);
      const [config, responses] = await Promise.all([getConfig(), getResponses()]);
      await handleExport(req, res, config, responses, url);
      return;
    }

    json(res, 404, { error: "找不到服務" });
  } catch (error) {
    console.error(error);
    json(res, error.statusCode || 500, { error: error.message || "伺服器錯誤" });
  }
};
