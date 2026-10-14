import { useEffect, useRef, useState } from "react";
import { customerApi } from "../lib/customer.js";

/*
 * "Continue with Google".
 *
 * The studio's Google OAuth client id is read from the server
 * (/api/customer/config) — a client id is public, but keeping it in one place
 * means the browser never needs it baked into the bundle at build time.
 *
 * Until a client id is configured the button renders disabled with a plain
 * explanation instead of a dead control that silently does nothing.
 */
export default function GoogleButton({ onCredential, text = "continue_with", label = "Continue with Google" }) {
  const [clientId, setClientId] = useState("");
  const [state, setState] = useState("checking"); // checking | ready | unconfigured
  const boxRef = useRef(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    customerApi
      .config()
      .then((data) => {
        if (cancelled) return;
        const id = String(data.googleClientId || "").trim();
        setClientId(id);
        setState(id ? "ready" : "unconfigured");
      })
      .catch(() => !cancelled && setState("unconfigured"));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== "ready" || !clientId) return;
    const mount = () => {
      if (!window.google?.accounts?.id || !boxRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => handler.current?.(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      boxRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(boxRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "pill",
        width: 320,
      });
    };

    if (document.getElementById("gsi-client")) {
      mount();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "gsi-client";
    script.onload = mount;
    document.head.appendChild(script);
  }, [state, clientId, text]);

  if (state === "checking") {
    return <div className="gbtn gbtn--loading" aria-hidden="true" />;
  }

  if (state === "unconfigured") {
    return (
      <div className="gbtn-wrap">
        <button type="button" className="gbtn gbtn--off" disabled>
          <span className="gbtn-logo" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="18" height="18">
              <path
                fill="#4285F4"
                d="M45.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12c-.2 2-1.5 5-4.4 7l6.8 5.3c4-3.7 6.7-9.1 6.7-16z"
              />
              <path
                fill="#34A853"
                d="M24 46c5.9 0 10.9-2 14.4-5.4l-6.8-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-6 0-11-4-12.8-9.4l-7 5.4C7.7 41.1 15.2 46 24 46z"
              />
              <path
                fill="#FBBC05"
                d="M11.2 28.1c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7-5.4C2.8 16.7 2 20.2 2 23.5s.8 6.8 2.2 9.9l7-5.3z"
              />
              <path
                fill="#EA4335"
                d="M24 9.5c4.2 0 7.2 1.8 8.9 3.4l6-5.9C35 3.4 30 .5 24 .5 15.2.5 7.7 5.4 4.2 13l7 5.4C13 13 18 9.5 24 9.5z"
              />
            </svg>
          </span>
          {label}
        </button>
        <p className="gbtn-hint">
          Google sign-in switches on as soon as the studio adds its Google OAuth client id
          (<code>GOOGLE_CLIENT_ID</code>). Email and password sign-in works right now.
        </p>
      </div>
    );
  }

  return (
    <div className="gbtn-wrap">
      <div className="gbtn-official" ref={boxRef} />
    </div>
  );
}
