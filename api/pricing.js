const pricing = require("../backend/data/pricing");

module.exports = function handler(_req, res) {
  res.status(200).json({
    studio: pricing.studio,
    singleClasses: pricing.singleClasses,
    comboClasses: pricing.comboClasses,
  });
};
