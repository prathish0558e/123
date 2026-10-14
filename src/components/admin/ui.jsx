/*
 * Tiny presentational helpers shared by the admin screens.
 * Kept dependency-free on purpose — the panel must stay easy to audit.
 */

export function Field({ label, hint, children, wide = false, className = "" }) {
  return (
    <label className={`adm-field ${wide ? "adm-field--wide" : ""} ${className}`}>
      <span className="adm-label">{label}</span>
      {children}
      {hint ? <span className="adm-hint">{hint}</span> : null}
    </label>
  );
}

export function Check({ label, checked, onChange, hint }) {
  return (
    <label className="adm-check">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

export function Notice({ kind = "ok", text, onClose }) {
  if (!text) return null;
  return (
    <p className={`adm-notice adm-notice--${kind}`} role={kind === "err" ? "alert" : "status"}>
      <i className={`bi ${kind === "err" ? "bi-exclamation-triangle" : "bi-check-circle"}`} aria-hidden="true"></i>
      <span>{text}</span>
      {onClose ? (
        <button type="button" onClick={onClose} aria-label="Dismiss">
          <i className="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      ) : null}
    </p>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="fh-loading">
      <i className="bi bi-arrow-repeat" aria-label={label}></i>
    </div>
  );
}

export function PanelCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || actions) && (
        <header className="adm-card-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="adm-card-actions">{actions}</div> : null}
        </header>
      )}
      <div className="adm-card-body">{children}</div>
    </section>
  );
}

export const inrInput = (v) => (v === "" || v === null || v === undefined ? "" : Number(v));
