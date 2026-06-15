# 2026夏之約滿意度調查 - Vercel 正式版

這個版本可部署到 Vercel，並使用 Postgres 資料庫保存問卷設定與回覆。

## 功能

- 前台不用登入即可填寫問卷
- 後台可登入管理
- 可修改問卷標題、說明、送出訊息
- 可修改題目、題型、必填、選項、新增/刪除/排序
- 回覆寫入 Postgres
- 後台可下載 XLSX、CSV、JSON
- 後台可開啟列印報表，使用瀏覽器另存 PDF

## 必要環境變數

在 Vercel 專案設定中加入：

```text
DATABASE_URL=你的 Postgres 連線字串
ADMIN_PASSWORD=後台管理密碼
```

Vercel 目前新的 Postgres 是透過 Marketplace 連接外部供應商，例如 Neon。連接完成後，Vercel 會把資料庫連線資訊注入專案環境變數；請確認環境變數名稱是 `DATABASE_URL`。

## 本機開發

```bash
npm install
npm run check
vercel dev
```

如果沒有設定 `DATABASE_URL`，API 會回報需要連接資料庫。

## 部署根目錄

在 Vercel 匯入 GitHub repo 時，Root Directory 請選：

```text
vercel-app
```

## 路徑

- 問卷：`/`
- 後台：`/admin.html`
- 列印報表：`/print.html`
