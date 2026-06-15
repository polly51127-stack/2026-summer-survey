const handler = require("../server");

module.exports = (req, res) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  req.url = `/api/admin/export${query}`;
  return handler(req, res);
};
