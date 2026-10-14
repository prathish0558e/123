const catalog = require("../../backend/lib/catalog");

module.exports = function handler(_req, res) {
  res.status(200).json(catalog.getStoreVersion());
};
