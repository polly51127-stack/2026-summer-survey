const handler = require("../server");

module.exports = (req, res) => {
  req.url = "/api/admin/responses";
  return handler(req, res);
};
