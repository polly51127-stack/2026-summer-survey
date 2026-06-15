const handler = require("./server");

module.exports = (req, res) => {
  req.url = "/api/responses";
  return handler(req, res);
};
