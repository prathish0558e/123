const catalog = require("../backend/lib/catalog");

module.exports = function handler(_req, res) {
  const { version, updatedAt } = catalog.getStoreVersion();
  const dresses = catalog.listDresses();
  const prices = dresses.map((dress) => dress.startingPrice).filter((price) => price > 0);

  res.status(200).json({
    version,
    updatedAt,
    categories: [...new Set(dresses.map((dress) => dress.category))],
    dresses,
    stats: {
      count: dresses.length,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    },
  });
};
