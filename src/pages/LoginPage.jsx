import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCustomer } from "../components/CustomerProvider.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import useSeo from "../lib/useSeo.js";

/*
 * The SHOPPER login (/login).
 *
 * This is deliberately not the admin panel: the studio signs in separately at
 * /admin with a username and password. Different page, different cookie,
 * different data.
 *
 * Signing in is needed to fill a bag: browsing and product pages are open to
 * everyone, but the bag, /cart and checkout all belong to an account. That is
 * why the navbar only shows the bag once there is a shopper behind it.
 */
export default function LoginPage() {
  const { signIn, register, googleSignIn } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /* Functional update: several fields filled in one tick (paste, autofill,
     password managers) must not lose each other. */
  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const next = location.state?.from || "/account";

  useSeo({
    title: mode === "login" ? "Sign in — TCT Fashion Hub" : "Create your account — TCT Fashion Hub",
    description:
      "Sign in to TCT Fashion Hub to place a Cash on Delivery order, save delivery addresses and track your stitching.",
    path: "/login",
    robots: "noindex, follow",
  });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await signIn({ email: form.email, password: form.password });
      else await register(form);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (credential) => {
    setBusy(true);
    setError("");
    try {
      await googleSignIn(credential);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section auth-section">
      <div className="auth-split">
        <div className="auth-card">
          <img className="auth-logo" src="/images/Logo.png" alt="TCT Fashion Hub" />
          <span className="eyebrow">{mode === "login" ? "Welcome back" : "Create your account"}</span>
          <h1>{mode === "login" ? "Sign in to shop" : "Join TCT Fashion Hub"}</h1>
          <p className="auth-sub">
            Sign in only when you need to — to place an order, save addresses and track
            your stitching.
          </p>

          <GoogleButton onCredential={onGoogle} />

          <div className="auth-or">
            <span>or</span>
          </div>

          {error ? (
            <div className="auth-error" role="alert">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {error}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" ? (
              <>
                <label>
                  Full name
                  <input value={form.name} onChange={update("name")} required autoComplete="name" />
                </label>
                <label>
                  Phone (for delivery updates)
                  <input
                    value={form.phone}
                    onChange={update("phone")}
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </label>
              </>
            ) : null}
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {mode === "register" ? (
                <small className="auth-hint">8+ characters, mixing letters and numbers.</small>
              ) : null}
            </label>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            className="auth-switch"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>

          <p className="auth-legal">
            By continuing you agree to our <Link to="/terms">terms</Link>,{" "}
            <Link to="/privacy">privacy policy</Link> and{" "}
            <Link to="/returns">return policy</Link>.
          </p>
        </div>

        <aside className="auth-aside">
          <h2>Why sign in?</h2>
          <ul>
            <li>
              <i className="bi bi-receipt" aria-hidden="true" />
              <span>
                <strong>Track every stitch</strong>
                <small>See each studio update, from cutting to delivery.</small>
              </span>
            </li>
            <li>
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <span>
                <strong>Save your address</strong>
                <small>One tap checkout next time.</small>
              </span>
            </li>
            <li>
              <i className="bi bi-cash-coin" aria-hidden="true" />
              <span>
                <strong>Pay on delivery</strong>
                <small>Cash on Delivery on every order.</small>
              </span>
            </li>
            <li>
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              <span>
                <strong>1-day return</strong>
                <small>For size issues and damaged pieces.</small>
              </span>
            </li>
          </ul>

          <div className="auth-admin">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            <div>
              <strong>Studio staff?</strong>
              <small>
                The admin panel has its own separate login at <Link to="/admin">/admin</Link>.
              </small>
            </div>
          </div>

          <Link className="auth-back" to="/">
            <i className="bi bi-arrow-left" aria-hidden="true" /> Back to the website
          </Link>
        </aside>
      </div>
    </section>
  );
}
