/*
 * Cover art for a category — the studio's own dress silhouettes.
 *
 * Kept in one place because the home page uses it in more than one band (the
 * browse rail and the promo carousel), and a missing key must fall back to the
 * placeholder instead of a broken image.
 */
export const CATEGORY_ART = {
  "Kurti & Tops": "/images/dresses/kurti.svg",
  Saree: "/images/dresses/saree.svg",
  Lehenga: "/images/dresses/lehenga.svg",
  Blouse: "/images/dresses/blouse.svg",
  Gown: "/images/dresses/gown.svg",
  "Kids Wear": "/images/dresses/kids.svg",
  Dupatta: "/images/dresses/dupatta.svg",
  Jewellery: "/images/dresses/jewellery.svg",
};

/** Always resolves to a real asset. */
export const artFor = (category) =>
  CATEGORY_ART[category] || "/images/placeholder.svg";

export default CATEGORY_ART;
