import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/admin.js";
import { inr } from "../../lib/shop.js";
import DressFlipCard from "../DressFlipCard.jsx";
import { Check, Field, Notice, PanelCard, Spinner } from "./ui.jsx";

const EMPTY = {
  name: "",
  category: "Kurti & Tops",
  startingPrice: "",
  priceMax: "",
  mrp: "",
  badge: "",
  fabric: "",
  sizes: "",
  colors: "",
  description: "",
  image: "",
  featured: false,
  inStock: true,
  visible: true,
};

const listify = (v) =>
  (Array.isArray(v) ? v : String(v || "").split(/[,\n]/))
    .map((s) => String(s).trim())
    .filter(Boolean);

/** Form shape for an existing dress (arrays become editable comma lists). */
function toForm(dress) {
  return {
    ...EMPTY,
    ...dress,
    startingPrice: dress.startingPrice ?? "",
    priceMax: dress.priceMax ?? "",
    mrp: dress.mrp ?? "",
    sizes: Array.isArray(dress.sizes) ? dress.sizes.join(", ") : dress.sizes || "",
    colors: Array.isArray(dress.colors) ? dress.colors.join(", ") : dress.colors || "",
    description: dress.description || "",
    image: dress.image || "",
  };
}

const SCOPES = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "hidden", label: "Hidden" },
  { id: "featured", label: "Featured" },
];

export default function DressManager({ categories: categoryOptions = [] }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(null); // dress id or "new"
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");

  const categories = useMemo(
    () => (categoryOptions.length ? categoryOptions : [EMPTY.category, "Other"]),
    [categoryOptions]
  );

  const load = async () => {
    try {
      const data = await adminApi.dresses();
      setList(data.dresses || []);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((d) => {
      if (scope === "live" && d.visible === false) return false;
      if (scope === "hidden" && d.visible !== false) return false;
      if (scope === "featured" && !d.featured) return false;
      if (!q) return true;
      return `${d.name} ${d.category} ${d.fabric}`.toLowerCase().includes(q);
    });
  }, [list, scope, search]);

  const counts = useMemo(
    () => ({
      all: list.length,
      live: list.filter((d) => d.visible !== false).length,
      hidden: list.filter((d) => d.visible === false).length,
      featured: list.filter((d) => d.featured).length,
    }),
    [list]
  );

  /** The exact shape the public page renders — used for the live preview. */
  const previewDress = useMemo(() => {
    const start = Number(form.startingPrice) || 0;
    const max = Number(form.priceMax) || start;
    return {
      id: "preview",
      name: form.name || "Untitled outfit",
      category: form.category,
      startingPrice: start,
      priceMax: max,
      mrp: Number(form.mrp) || 0,
      image: form.image || "/images/placeholder.svg",
      sizes: listify(form.sizes),
      colors: listify(form.colors),
      fabric: form.fabric,
      badge: form.badge,
      description: form.description,
      featured: Boolean(form.featured),
      inStock: Boolean(form.inStock),
      visible: true,
      updated_at: "preview",
    };
  }, [form]);

  const openNew = () => {
    setForm({ ...EMPTY, category: categories[0] });
    setEditing("new");
    setFormError("");
    setNote("");
  };

  const openEdit = (dress) => {
    setForm(toForm(dress));
    setEditing(dress.id);
    setFormError("");
    setNote("");
  };

  const close = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Give the dress a name.");
      return;
    }
    if (!Number(form.startingPrice)) {
      setFormError("The starting price is what shoppers see first — set it.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        startingPrice: Number(form.startingPrice) || 0,
        priceMax: Number(form.priceMax) || Number(form.startingPrice) || 0,
        mrp: Number(form.mrp) || 0,
      };
      if (editing === "new") await adminApi.createDress(payload);
      else await adminApi.updateDress(editing, payload);
      await load();
      setNote(
        editing === "new"
          ? "Dress added — it is live on the site now."
          : "Changes saved and live."
      );
      close();
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (dress) => {
    if (!window.confirm(`Delete “${dress.name}”? This cannot be undone.`)) return;
    try {
      await adminApi.deleteDress(dress.id);
      await load();
      setNote(`“${dress.name}” deleted.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleVisible = async (dress) => {
    try {
      await adminApi.updateDress(dress.id, { ...toForm(dress), visible: !dress.visible });
      await load();
      setNote(
        dress.visible
          ? `“${dress.name}” hidden from the site.`
          : `“${dress.name}” is live again.`
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });
      const { url } = await adminApi.uploadImage(form.name || "dress", dataUrl);
      set({ image: url });
      setNote("Photo uploaded — remember to save.");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Notice kind="ok" text={note} onClose={() => setNote("")} />
      <Notice kind="err" text={error} onClose={() => setError("")} />

      <PanelCard
        title="Boutique collection"
        subtitle={`${counts.all} designs · ${counts.live} live · ${counts.hidden} hidden · shoppers see the starting price on every flip card`}
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <i className="bi bi-plus-lg"></i> Add dress
          </button>
        }
      >
        {loading ? (
          <Spinner label="Loading dresses" />
        ) : list.length ? (
          <>
            <div className="adm-list-toolbar">
              <div className="adm-search">
                <i className="bi bi-search" aria-hidden="true"></i>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, category or fabric…"
                  aria-label="Search designs"
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true"></i>
                  </button>
                ) : null}
              </div>
              <div className="adm-tabs adm-tabs--inline">
                {SCOPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={scope === s.id ? "is-active" : ""}
                    aria-pressed={scope === s.id}
                    onClick={() => setScope(s.id)}
                  >
                    {s.label} <span>{counts[s.id]}</span>
                  </button>
                ))}
              </div>
            </div>

            {shown.length ? (
              <div className="adm-rows">
                {shown.map((d) => (
                  <div className={`adm-row ${d.visible ? "" : "is-hidden"}`} key={d.id}>
                    <img
                      className="adm-thumb"
                      src={d.image || "/images/placeholder.svg"}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder.svg";
                      }}
                    />
                    <div className="adm-row-main">
                      <strong>{d.name}</strong>
                      <span className="adm-row-meta">
                        {d.category} · {inr(d.startingPrice)}
                        {Number(d.priceMax) > Number(d.startingPrice)
                          ? ` – ${inr(d.priceMax)}`
                          : ""}
                        {d.featured ? " · featured" : ""}
                      </span>
                    </div>
                    <span
                      className={`adm-pill ${
                        d.visible === false ? "adm-pill--muted" : "adm-pill--ok"
                      }`}
                    >
                      {d.visible === false ? "Hidden" : "Live"}
                    </span>
                    <div className="adm-row-actions">
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => toggleVisible(d)}
                        aria-label={d.visible ? `Hide ${d.name}` : `Show ${d.name}`}
                      >
                        <i className={`bi ${d.visible ? "bi-eye-slash" : "bi-eye"}`}></i>
                        {d.visible ? "Hide" : "Show"}
                      </button>
                      <button type="button" className="adm-btn" onClick={() => openEdit(d)}>
                        <i className="bi bi-pencil"></i> Edit
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger"
                        onClick={() => remove(d)}
                        aria-label={`Delete ${d.name}`}
                      >
                        <i className="bi bi-trash3"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-empty">
                Nothing matches that filter — {counts.all} designs in total.
              </p>
            )}
          </>
        ) : (
          <p className="adm-empty">No designs yet — add the first one.</p>
        )}
      </PanelCard>

      {editing ? (
        <div className="adm-drawer" role="dialog" aria-label="Dress editor">
          <div className="adm-drawer-panel adm-drawer-panel--wide">
            <header className="adm-drawer-head">
              <div>
                <h3>{editing === "new" ? "Add a dress" : "Edit dress"}</h3>
                <p className="adm-drawer-sub">
                  Changes appear on the live site within seconds of saving.
                </p>
              </div>
              <button
                type="button"
                className="adm-btn"
                onClick={close}
                aria-label="Close editor"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </header>

            <div className="adm-editor-grid">
              <form className="adm-form" onSubmit={save}>
                <Notice kind="err" text={formError} onClose={() => setFormError("")} />

                <div className="adm-grid-2">
                  <Field label="Name *">
                    <input
                      value={form.name}
                      onChange={(e) => set({ name: e.target.value })}
                      placeholder="Cotton Aari Kurti"
                      required
                    />
                  </Field>
                  <Field label="Category">
                    <select
                      value={form.category}
                      onChange={(e) => set({ category: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="adm-grid-3">
                  <Field label="Starting price (Rs) *" hint="Shown on the flip card">
                    <input
                      type="number"
                      min="0"
                      value={form.startingPrice}
                      onChange={(e) => set({ startingPrice: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Highest price (Rs)">
                    <input
                      type="number"
                      min="0"
                      value={form.priceMax}
                      onChange={(e) => set({ priceMax: e.target.value })}
                    />
                  </Field>
                  <Field label="MRP (Rs)" hint="Optional — powers the ‘% off’ tag">
                    <input
                      type="number"
                      min="0"
                      value={form.mrp}
                      onChange={(e) => set({ mrp: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="adm-grid-3">
                  <Field label="Ribbon / badge" hint="e.g. Bestseller">
                    <input
                      value={form.badge}
                      onChange={(e) => set({ badge: e.target.value })}
                      maxLength={24}
                    />
                  </Field>
                  <Field label="Fabric">
                    <input
                      value={form.fabric}
                      onChange={(e) => set({ fabric: e.target.value })}
                      placeholder="Pure cotton, hand aari yoke"
                    />
                  </Field>
                  <Field label="Sizes" hint="Comma separated">
                    <input
                      value={form.sizes}
                      onChange={(e) => set({ sizes: e.target.value })}
                      placeholder="S, M, L, XL"
                    />
                  </Field>
                </div>

                <Field label="Colours" hint="Comma separated">
                  <input
                    value={form.colors}
                    onChange={(e) => set({ colors: e.target.value })}
                    placeholder="Indigo, Mustard, Rust"
                  />
                </Field>

                <Field label="Description">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder="What makes this piece special?"
                  />
                </Field>

                <Field
                  label="Photo"
                  hint="Drop a JPEG/PNG under 3 MB here, choose one, or paste an image URL"
                >
                  <div
                    className={`adm-image-row ${dragging ? "is-dragging" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      upload(e.dataTransfer?.files?.[0]);
                    }}
                  >
                    <img
                      className="adm-thumb adm-thumb--lg"
                      src={form.image || "/images/placeholder.svg"}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = "/images/placeholder.svg";
                      }}
                    />
                    <div className="adm-image-controls">
                      <input
                        value={form.image}
                        onChange={(e) => set({ image: e.target.value })}
                        placeholder="/uploads/photo.jpg or https://…"
                      />
                      <label className="adm-upload">
                        <i className="bi bi-cloud-arrow-up"></i>
                        {uploading
                          ? "Uploading…"
                          : dragging
                          ? "Drop the photo here"
                          : "Choose or drop a photo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => upload(e.target.files?.[0])}
                          hidden
                        />
                      </label>
                    </div>
                  </div>
                </Field>

                <div className="adm-checks">
                  <Check
                    label="Featured"
                    hint="Shown first in the collection"
                    checked={form.featured}
                    onChange={(v) => set({ featured: v })}
                  />
                  <Check
                    label="In stock"
                    hint="Untick for made-to-order"
                    checked={form.inStock}
                    onChange={(v) => set({ inStock: v })}
                  />
                  <Check
                    label="Visible on the site"
                    checked={form.visible}
                    onChange={(v) => set({ visible: v })}
                  />
                </div>

                <div className="adm-form-actions">
                  <button type="button" className="btn adm-btn" onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : editing === "new" ? "Add dress" : "Save changes"}
                  </button>
                </div>
              </form>

              <aside className="adm-preview">
                <span className="adm-preview-label">
                  <i className="bi bi-eye" aria-hidden="true"></i> Live flip-card preview
                </span>
                <div className="adm-preview-stage">
                  <DressFlipCard dress={previewDress} compact />
                </div>
                <p className="adm-hint">
                  This is exactly what a shopper sees on the home page. Tap the card to
                  check the back.
                </p>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
