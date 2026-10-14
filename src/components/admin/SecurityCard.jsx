import { useState } from "react";
import { adminApi } from "../../lib/admin.js";
import { Field, Notice, PanelCard } from "./ui.jsx";

export default function SecurityCard({ admin, onPasswordChanged }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetNote, setResetNote] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setError("The two new passwords do not match.");
      return;
    }
    if (form.next.length < 8 || !/[A-Za-z]/.test(form.next) || !/\d/.test(form.next)) {
      setError("Use at least 8 characters with both letters and numbers.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await adminApi.changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      setNote("Password changed. Every other session was signed out.");
      onPasswordChanged?.(data.admin);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const resetCatalogue = async () => {
    try {
      await adminApi.resetCatalog();
      setResetNote(
        "Starter catalogue restored. Reload this page to see the seeded dresses and classes."
      );
      setResetArmed(false);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      {admin?.is_default_password ? (
        <Notice
          kind="err"
          text="You are still using the first-boot password. Change it below — anyone who finds this page could otherwise sign in."
        />
      ) : null}

      <PanelCard
        title="Change password"
        subtitle={`Signed in as ${admin?.username || "admin"}${
          admin?.last_login_at ? ` · last login ${new Date(admin.last_login_at).toLocaleString("en-IN")}` : ""
        }`}
      >
        <form className="adm-form" onSubmit={submit}>
          <Notice kind="err" text={error} onClose={() => setError("")} />
          <Notice kind="ok" text={note} onClose={() => setNote("")} />

          <div className="adm-grid-3">
            <Field label="Current password">
              <input
                type="password"
                autoComplete="current-password"
                value={form.current}
                onChange={(e) => set({ current: e.target.value })}
                required
              />
            </Field>
            <Field label="New password" hint="Min 8 characters, letters + numbers">
              <input
                type="password"
                autoComplete="new-password"
                value={form.next}
                onChange={(e) => set({ next: e.target.value })}
                required
              />
            </Field>
            <Field label="Repeat new password">
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => set({ confirm: e.target.value })}
                required
              />
            </Field>
          </div>

          <div className="adm-form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="How sign-in is protected" subtitle="No plain-text passwords, anywhere.">
        <ul className="adm-facts">
          <li>
            <i className="bi bi-shield-lock"></i>
            <span>
              Passwords are hashed with <strong>scrypt</strong> (N=16384, r=8, p=1) and a
              random <strong>16-byte salt</strong> per account, producing a 64-byte key.
              Only the salt and the hash are stored — in{" "}
              <code>backend/data/admins.json</code>.
            </span>
          </li>
          <li>
            <i className="bi bi-hourglass-split"></i>
            <span>
              Sign-in returns an opaque 32-byte session token in an{" "}
              <strong>HttpOnly</strong> cookie (8-hour life). The browser JavaScript
              never touches it, and it is compared in constant time on the server.
            </span>
          </li>
          <li>
            <i className="bi bi-fingerprint"></i>
            <span>
              Password checks use <code>crypto.timingSafeEqual</code>, so response time
              cannot leak how much of a guess was right.
            </span>
          </li>
          <li>
            <i className="bi bi-stopwatch"></i>
            <span>
              5 wrong attempts per username + IP trigger a 15-minute lockout, and every
              edit needs the same-origin admin header (CSRF guard).
            </span>
          </li>
        </ul>
      </PanelCard>

      <PanelCard
        title="Restore the starter catalogue"
        subtitle="Use this only if you want to throw away your edits and go back to the seeded dresses and classes."
        className="adm-card--danger"
      >
        <Notice kind="ok" text={resetNote} onClose={() => setResetNote("")} />
        {resetArmed ? (
          <div className="adm-danger-confirm">
            <p>
              This deletes every dress and class change you made and restores the
              starter catalogue. Continue?
            </p>
            <div className="adm-form-actions">
              <button type="button" className="adm-btn" onClick={() => setResetArmed(false)}>
                Cancel
              </button>
              <button type="button" className="btn adm-btn-danger" onClick={resetCatalogue}>
                Yes, restore the starter catalogue
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn adm-btn-danger" onClick={() => setResetArmed(true)}>
            <i className="bi bi-arrow-counterclockwise"></i> Reset catalogue
          </button>
        )}
      </PanelCard>
    </>
  );
}
