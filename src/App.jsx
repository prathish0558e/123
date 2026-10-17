import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import WhatsAppFloat from "./components/WhatsAppFloat.jsx";
import MiniBag from "./components/MiniBag.jsx";
import ToTop from "./components/ToTop.jsx";
import HomePage from "./pages/HomePage.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import ClassesPage from "./pages/ClassesPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import EnquirePage from "./pages/EnquirePage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import OrderPage from "./pages/OrderPage.jsx";
import PolicyPage from "./pages/PolicyPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";
import TctMascot from "./mascot/TctMascot.jsx";
import StreetMascot from "./mascot/StreetMascot.jsx";
import { CustomerProvider } from "./components/CustomerProvider.jsx";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // SPA navigation must not inherit the browser's saved scroll offsets
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const playEnter = () => {
      // replay the page-enter animation on every navigation
      const main = document.getElementById("tct-main");
      if (main) {
        main.classList.remove("page-enter");
        void main.offsetWidth; // force reflow so the animation restarts
        main.classList.add("page-enter");
      }
    };

    if (!hash) {
      window.scrollTo(0, 0);
      playEnter();
      return;
    }

    /* Deep link such as /classes#combos — land on the section, not the top.
       The target section can render a tick later (its data is still loading),
       so retry briefly instead of silently dropping the visitor at the top. */
    let tries = 0;
    let timer;
    const attempt = () => {
      let el = null;
      try {
        el = document.querySelector(hash);
      } catch {
        el = null;
      }
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
      if (tries++ < 40) timer = setTimeout(attempt, 60);
      else window.scrollTo(0, 0);
    };
    attempt();
    return () => clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}

/** Everything the public site shows — the admin panel runs chrome-free. */
function SiteChrome({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  // The admin dashboard brings its own <main> — never nest two of them.
  if (isAdmin) return <div id="tct-main">{children}</div>;

  return (
    <>
      <Navbar />
      <main id="tct-main" className="page-enter">
        {children}
      </main>
      <Footer />
      <WhatsAppFloat />
      <ToTop />
      {/* slides in the moment something is added to the bag */}
      <MiniBag />
      {/* bottom street: road + store + the human guide */}
      <StreetMascot />
      {/* chat panel + assistant brain opened by the street guide */}
      <TctMascot street />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CustomerProvider>
        <ScrollToTop />
        <SiteChrome>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:id" element={<ProductPage />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/enquire" element={<EnquirePage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders/:id" element={<OrderPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/privacy" element={<PolicyPage kind="privacy" />} />
            <Route path="/terms" element={<PolicyPage kind="terms" />} />
            <Route path="/returns" element={<PolicyPage kind="returns" />} />
            {/* The studio panel has its own separate sign-in. */}
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </SiteChrome>
      </CustomerProvider>
    </BrowserRouter>
  );
}
