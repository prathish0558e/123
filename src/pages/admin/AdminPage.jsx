import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DressManager from "../../components/admin/DressManager.jsx";
import ClassManager from "../../components/admin/ClassManager.jsx";
import EnquiryList from "../../components/admin/EnquiryList.jsx";
import SecurityCard from "../../components/admin/SecurityCard.jsx";
import { Field, Notice, Spinner } from "../../components/admin/ui.jsx";
import useSeo from "../../lib/useSeo.js";
import { adminApi } from "../../lib/admin.js";
import { DRESS_CATEGORIES } from "../../lib/categories.js";

const TABS = [
  { id: "boutique", label: "Boutique", icon: "bi-bag-heart" },
  { id: "classes", label: "Classes", icon: "bi-mortarboard" },
  { id: "orders", label: "Orders", icon: "bi-receipt" },
  { id: "customers", label: "Customers", icon: "bi-people" },
  { id: "enquiries", label: "Enquiries", icon: "bi-inbox" },
  { id: "security", label: "Settings", icon: "bi-shield-lock" },
];

function CustomerOrders({ type }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const request = type === "orders" ? adminApi.orders() : adminApi.customers();
    request.then(setData).catch((err) => setError(err.message));
  }, [type]);
  if (error) return <Notice kind="err" text={error} />;
  if (!data) return <Spinner />;
  if (type === "customers") {
    return (
      <section className="adm-card">
        <div className="adm-card-head"><div><h3>Customer accounts</h3><p>Registered shoppers and their account activity.</p></div></div>
        <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>
          {(data.customers || []).map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.email}</td><td>{customer.phone || "—"}</td><td>{new Date(customer.created_at).toLocaleDateString("en-IN")}</td></tr>)}
        </tbody></table></div>
      </section>
    );
  }
  return (
    <section className="adm-card">
      <div className="adm-card-head"><div><h3>Customer orders</h3><p>Orders placed through the website.</p></div></div>
      <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
        {(data.orders || []).map((order) => <tr key={order.id}><td><strong>{order.id}</strong><small>{new Date(order.created_at).toLocaleString("en-IN")}</small></td><td>{order.customer_name}<small>{order.customer_email}</small></td><td>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td><td>Rs {Number(order.total).toLocaleString("en-IN")}</td><td><span className="adm-status">{order.status}</span></td></tr>)}
      </tbody></table></div>
    </section>
  );
}

/* ------------------------------------------------------------------ login */
function LoginScreen({ onSignedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await adminApi.login(username.trim(), password);
      onSignedIn(data.admin);
    } catch (e2) {
      setError(e2.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-login">
      <div className="adm-login-card">
        <img className="adm-login-logo" src="/images/Logo.png" alt="TCT Fashion Hub" />
        <span className="eyebrow" style={{ justifyContent: "center" }}>
          Studio admin
        </span>
        <h1>Sign in to manage the shop</h1>
        <p className="adm-login-sub">
          Passwords are stored as scrypt hashes with a per-account salt — this sign-in
          never sends or keeps a plain password.
        </p>

        <Notice kind="err" text={error} onClose={() => setError("")} />

        <form className="adm-form" onSubmit={submit}>
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>

        <p className="adm-login-foot">
          Locked out? Delete <code>backend/data/admins.json</code> and restart the server —
          a fresh account is created and printed in the server console.
        </p>
        <p className="adm-login-foot">
          <Link to="/">
            <i className="bi bi-arrow-left"></i> Back to the website
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- overview */
const TILES = [
  { id: "dresses", label: "Designs live", icon: "bi-bag-heart", tone: "blue" },
  { id: "hidden", label: "Hidden designs", icon: "bi-eye-slash", tone: "slate" },
  { id: "classes", label: "Classes + combos", icon: "bi-mortarboard", tone: "violet" },
  { id: "newEnquiries", label: "New enquiries", icon: "bi-inbox", tone: "orange" },
];

/** Small at-a-glance strip so the panel answers "is anything waiting?" fast. */
function Overview({ refresher }) {
  const [stats, setStats] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dresses, classes, enquiries] = await Promise.all([
          adminApi.dresses(),
          adminApi.classes(),
          adminApi.enquiries(),
        ]);
        if (!alive) return;
        const list = dresses.dresses || [];
        const enquiriesList = enquiries.enquiries || [];
        setStats({
          dresses: list.filter((d) => d.visible !== false).length,
          hidden: list.filter((d) => d.visible === false).length,
          classes:
            (classes.singleClasses || []).length + (classes.comboClasses || []).length,
          newEnquiries: enquiriesList.filter((e) => e.status === "new").length,
        });
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refresher]);

  return (
    <div className="adm-stats">
      {TILES.map((t) => (
        <div className={`adm-stat adm-stat--${t.tone}`} key={t.id}>
          <i className={`bi ${t.icon}`} aria-hidden="true"></i>
          <span className="adm-stat-value">
            {failed ? "—" : stats ? stats[t.id] : "·"}
          </span>
          <span className="adm-stat-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- dashboard */
function Dashboard({ admin, onSignOut }) {
  const [tab, setTab] = useState("boutique");
  const [me, setMe] = useState(admin);
  const [ticks, setTicks] = useState(0);

  return (
    <div className="adm-shell">
      <header className="adm-bar">
        <div className="adm-bar-inner">
          <div className="adm-brand">
            <i className="bi bi-shop-window"></i>
            <span>
              <strong>Admin panel</strong>
              <small>TCT Fashion Hub · Ganapathy</small>
            </span>
          </div>            <nav className="adm-tabs" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tab === t.id ? "is-active" : ""}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => {
                  setTab(t.id);
                  setTicks((n) => n + 1); // refresh the overview + panel data
                }}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true"></i>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="adm-bar-actions">
            <Link to="/" className="adm-btn">
              <i className="bi bi-box-arrow-up-right"></i> View site
            </Link>
            <button type="button" className="adm-btn adm-btn--danger" onClick={onSignOut}>
              <i className="bi bi-box-arrow-right"></i> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="adm-main">
        <div className="container">
          <Overview refresher={ticks} />
          {/* remounting the panel on a tab switch keeps each screen's data fresh */}
          <div key={`${tab}-${ticks}`}>
          {tab === "boutique" ? <DressManager categories={DRESS_CATEGORIES} /> : null}
          {tab === "classes" ? <ClassManager /> : null}
          {tab === "orders" ? <CustomerOrders type="orders" /> : null}
          {tab === "customers" ? <CustomerOrders type="customers" /> : null}
          {tab === "enquiries" ? <EnquiryList /> : null}
          {tab === "security" ? (
            <SecurityCard admin={me} onPasswordChanged={setMe} />
          ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------- page */
export default function AdminPage() {
  const [state, setState] = useState({ loading: true, admin: null });

  useSeo({
    title: "Admin — TCT Fashion Hub",
    description: "Private studio dashboard.",
    path: "/admin",
    robots: "noindex, nofollow",
  });

  const check = useCallback(async () => {
    try {
      const data = await adminApi.session();
      setState({ loading: false, admin: data?.ok ? data.admin : null });
    } catch {
      setState({ loading: false, admin: null });
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const signOut = async () => {
    try {
      await adminApi.logout();
    } finally {
      setState({ loading: false, admin: null });
    }
  };

  if (state.loading) return <Spinner label="Checking your session" />;
  if (!state.admin) {
    return <LoginScreen onSignedIn={(admin) => setState({ loading: false, admin })} />;
  }
  return <Dashboard admin={state.admin} onSignOut={signOut} />;
}
