import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomer } from "../components/CustomerProvider.jsx";
import useSeo from "../lib/useSeo.js";

export default function LoginPage() {
  const { signIn, register } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useSeo({ title: "Login — TCT Fashion Hub", description: "Login or create your TCT Fashion Hub account.", path: "/login", robots: "noindex" });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await signIn({ email: form.email, password: form.password });
      else await register(form);
      navigate(location.state?.from || "/cart", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section auth-section">
      <div className="auth-card">
        <img className="auth-logo" src="/images/Logo.jpeg" alt="TCT Fashion Hub" />
        <span className="eyebrow">{mode === "login" ? "Welcome back" : "Join TCT"}</span>
        <h1>{mode === "login" ? "Login to continue shopping" : "Create your account"}</h1>
        <p className="auth-sub">Save your cart, place orders and track your purchases securely.</p>
        {error ? <div className="auth-error" role="alert">{error}</div> : null}
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? (
            <>
              <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" /></label>
              <label>Phone (optional)<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label>
            </>
          ) : null}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}</button>
        </form>
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Login"}
        </button>
        <Link className="auth-back" to="/"><i className="bi bi-arrow-left" /> Back to website</Link>
      </div>
    </section>
  );
}
