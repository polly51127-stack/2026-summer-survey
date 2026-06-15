const handler = require("../server");

module.exports = (req, res) => {
  req.url = "/api/admin/config";
  return handler(req, res);
};
