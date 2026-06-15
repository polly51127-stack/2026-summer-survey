const handler = require("./server");

module.exports = (req, res) => {
  req.url = "/api/config";
  return handler(req, res);
};
