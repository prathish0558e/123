import { useState } from "react";

/*
 * Delivery address form — the same fields a marketplace asks for, so the
 * studio can actually courier the parcel: receiver, 10-digit mobile, 6-digit
 * pincode, street, city, state and an optional landmark.
 */
const EMPTY = {
  name: "",
  phone: "",
  pincode: "",
  line1: "",
  line2: "",
  city: "",
  state: "Tamil Nadu",
  landmark: "",
  type: "home",
};

export default function AddressForm({
  initial = {},
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = "Save address",
  compact = false,
}) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    try {
      await onSubmit(form);
    } catch (error) {
      if (error?.errors) setErrors(error.errors);
      else setErrors({ form: error.message });
    }
  };

  const field = (key, label, props = {}) => (
    <label className={`addr-field ${props.wide ? "addr-field--wide" : ""}`}>
      <span>{label}</span>
      <input
        value={form[key]}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        {...props}
      />
      {errors[key] ? <em className="addr-err">{errors[key]}</em> : null}
    </label>
  );

  return (
    <form className={`addr-form ${compact ? "is-compact" : ""}`} onSubmit={submit}>
      {errors.form ? (
        <p className="addr-form-error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {errors.form}
        </p>
      ) : null}

      <div className="addr-grid">
        {field("name", "Full name", { autoComplete: "name", placeholder: "Receiver's name" })}
        {field("phone", "Mobile number", {
          inputMode: "numeric",
          autoComplete: "tel",
          placeholder: "10-digit mobile",
          maxLength: 15,
        })}
        {field("pincode", "Pincode", {
          inputMode: "numeric",
          autoComplete: "postal-code",
          placeholder: "6-digit pincode",
          maxLength: 6,
        })}
        {field("city", "City / town", { autoComplete: "address-level2" })}
        {field("line1", "Flat, house no., building, street", {
          autoComplete: "address-line1",
          wide: true,
          placeholder: "12/4 Gandhi Street, Gandhipuram",
        })}
        {field("line2", "Area, colony (optional)", {
          autoComplete: "address-line2",
          wide: true,
        })}
        {field("state", "State", { autoComplete: "address-level1" })}
        {field("landmark", "Landmark (optional)", { placeholder: "Near ICICI Bank" })}
        <label className="addr-field">
          <span>Address type</span>
          <select value={form.type} onChange={set("type")}>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="addr-actions">
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btn-outline" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
