import { useEffect, useState } from "react";
import { adminApi } from "../../lib/admin.js";
import { inr } from "../../lib/shop.js";
import { Check, Field, Notice, PanelCard, Spinner } from "./ui.jsx";

const EMPTY = {
  name: "",
  price: "",
  total: "",
  duration: "1 Month",
  level: "All levels",
  gift: "",
  image: "",
  badge: "",
  items: "",
  featured: false,
  visible: true,
};

const asText = (v) => (Array.isArray(v) ? v.join(", ") : v || "");

function toForm(kind, item) {
  return {
    ...EMPTY,
    ...item,
    price: item.price ?? "",
    total: item.total ?? "",
    items: asText(item.items),
    gift: item.gift || "",
    image: item.image || "",
  };
}

export default function ClassManager() {
  const [kind, setKind] = useState("single");
  const [single, setSingle] = useState([]);
  const [combo, setCombo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(null); // id | "new"
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const list = kind === "single" ? single : combo;

  const load = async () => {
    try {
      const data = await adminApi.classes();
      setSingle(data.singleClasses || []);
      setCombo(data.comboClasses || []);
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

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const openNew = () => {
    setForm({ ...EMPTY, name: kind === "combo" ? "" : "" });
    setEditing("new");
    setFormError("");
    setNote("");
  };

  const openEdit = (item) => {
    setForm(toForm(kind, item));
    setEditing(item.id);
    setFormError("");
    setNote("");
  };

  const close = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Give the class a name.");
      return;
    }
    const amount = kind === "combo" ? Number(form.total) : Number(form.price);
    if (!amount) {
      setFormError(kind === "combo" ? "Set the combo price." : "Set the class fee.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload =
        kind === "combo"
          ? { ...form, total: amount, items: form.items }
          : { ...form, price: amount };
      if (editing === "new") await adminApi.createClass(kind, payload);
      else await adminApi.updateClass(kind, editing, payload);
      await load();
      setNote(editing === "new" ? "Class added." : "Class updated — live on the site now.");
      close();
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete “${item.name}”?`)) return;
    try {
      await adminApi.deleteClass(kind, item.id);
      await load();
      setNote(`“${item.name}” deleted.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleVisible = async (item) => {
    try {
      await adminApi.updateClass(kind, item.id, {
        ...toForm(kind, item),
        visible: !item.visible,
      });
      await load();
      setNote(item.visible ? `“${item.name}” hidden.` : `“${item.name}” is live again.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });
      const { url } = await adminApi.uploadImage(form.name || "class", dataUrl);
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
        title="Craft classes"
        subtitle="These are the classes your students enrol in — the same data the Classes page shows."
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <i className="bi bi-plus-lg"></i> Add {kind === "combo" ? "combo" : "class"}
          </button>
        }
      >
        <div className="adm-tabs adm-tabs--inline">
          <button
            type="button"
            className={kind === "single" ? "is-active" : ""}
            onClick={() => {
              setKind("single");
              close();
            }}
          >
            Single classes <span>{single.length}</span>
          </button>
          <button
            type="button"
            className={kind === "combo" ? "is-active" : ""}
            onClick={() => {
              setKind("combo");
              close();
            }}
          >
            Combos <span>{combo.length}</span>
          </button>
        </div>

        {loading ? (
          <Spinner label="Loading classes" />
        ) : list.length ? (
          <div className="adm-rows">
            {list.map((item) => (
              <div className={`adm-row ${item.visible ? "" : "is-hidden"}`} key={item.id}>
                <img
                  className="adm-thumb"
                  src={item.image || "/images/placeholder.svg"}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = "/images/placeholder.svg";
                  }}
                />
                <div className="adm-row-main">
                  <strong>{item.name}</strong>
                  <span className="adm-row-meta">
                    {kind === "combo" ? inr(item.total) : inr(item.price)} · {item.duration} ·{" "}
                    {item.level}
                    {item.visible ? "" : " · hidden"}
                  </span>
                </div>
                <div className="adm-row-actions">
                  <button type="button" className="adm-btn" onClick={() => toggleVisible(item)}>
                    <i className={`bi ${item.visible ? "bi-eye-slash" : "bi-eye"}`}></i>
                    {item.visible ? "Hide" : "Show"}
                  </button>
                  <button type="button" className="adm-btn" onClick={() => openEdit(item)}>
                    <i className="bi bi-pencil"></i> Edit
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    onClick={() => remove(item)}
                    aria-label={`Delete ${item.name}`}
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-empty">Nothing here yet.</p>
        )}
      </PanelCard>

      {editing ? (
        <div className="adm-drawer" role="dialog" aria-label="Class editor">
          <div className="adm-drawer-panel">
            <header className="adm-drawer-head">
              <h3>
                {editing === "new" ? "Add" : "Edit"}{" "}
                {kind === "combo" ? "combo" : "class"}
              </h3>
              <button type="button" className="adm-btn" onClick={close} aria-label="Close editor">
                <i className="bi bi-x-lg"></i>
              </button>
            </header>

            <form className="adm-form" onSubmit={save}>
              <Notice kind="err" text={formError} onClose={() => setFormError("")} />

              <Field label="Name *">
                <input
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder={kind === "combo" ? "Embroidery + Aari Duo" : "Tailoring Class"}
                  required
                />
              </Field>

              <div className="adm-grid-3">
                {kind === "combo" ? (
                  <Field label="Combo price (Rs) *">
                    <input
                      type="number"
                      min="0"
                      value={form.total}
                      onChange={(e) => set({ total: e.target.value })}
                      required
                    />
                  </Field>
                ) : (
                  <Field label="Class fee (Rs) *">
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => set({ price: e.target.value })}
                      required
                    />
                  </Field>
                )}
                <Field label="Duration">
                  <input
                    value={form.duration}
                    onChange={(e) => set({ duration: e.target.value })}
                    placeholder="1 Month"
                  />
                </Field>
                <Field label="Level">
                  <input
                    value={form.level}
                    onChange={(e) => set({ level: e.target.value })}
                    placeholder="All levels"
                  />
                </Field>
              </div>

              {kind === "combo" ? (
                <div className="adm-grid-2">
                  <Field label="Includes" hint="Comma separated class names">
                    <input
                      value={form.items}
                      onChange={(e) => set({ items: e.target.value })}
                      placeholder="Embroidery Class, Aari Work Class"
                    />
                  </Field>
                  <Field label="Ribbon / badge">
                    <input
                      value={form.badge}
                      onChange={(e) => set({ badge: e.target.value })}
                      maxLength={24}
                    />
                  </Field>
                </div>
              ) : null}

              <Field label="Kit gift">
                <input
                  value={form.gift}
                  onChange={(e) => set({ gift: e.target.value })}
                  placeholder="Kit gift: measuring tape, chalk set & handbook"
                />
              </Field>

              <Field label="Photo" hint="Upload a JPEG/PNG under 3 MB, or paste an image URL">
                <div className="adm-image-row">
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
                      placeholder="/images/… or https://…"
                    />
                    <label className="adm-upload">
                      <i className="bi bi-upload"></i>
                      {uploading ? "Uploading…" : "Choose a photo"}
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
                {kind === "combo" ? (
                  <Check
                    label="Featured"
                    checked={form.featured}
                    onChange={(v) => set({ featured: v })}
                  />
                ) : null}
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
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
