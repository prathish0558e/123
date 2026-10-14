/*
 * Boutique categories shown in the admin form's dropdown.
 * Kept in sync with DRESS_CATEGORIES in backend/lib/catalog.js — the backend
 * always validates against its own list, so an unknown value falls back to
 * "Other" instead of ever reaching the store.
 */
export const DRESS_CATEGORIES = [
  "Kurti & Tops",
  "Saree",
  "Lehenga",
  "Blouse",
  "Gown",
  "Kids Wear",
  "Dupatta",
  "Jewellery",
  "Other",
];
