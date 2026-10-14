import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/admin.js";
import { COMPANY } from "../../data/content.js";
import { Notice, PanelCard, Spinner } from "./ui.jsx";

const STATUSES = ["new", "contacted", "enrolled", "closed"];

const statusClass = (s) =>
  ({ new: "adm-pill--new", contacted: "adm-pill--warn", enrolled: "adm-pill--ok" }[s] ||
  "adm-pill--muted");

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function EnquiryList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const data = await adminApi.enquiries();
      setList(data.enquiries || []);
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

  const shown = useMemo(
    () => (filter === "all" ? list : list.filter((e) => e.status === filter)),
    [list, filter]
  );

  const setStatus = async (enquiry, status) => {
    try {
      await adminApi.setEnquiryStatus(enquiry.id, status);
      setList((l) => l.map((e) => (e.id === enquiry.id ? { ...e, status } : e)));
      setNote(`Marked ${enquiry.name} as ${status}.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const counts = useMemo(() => {
    const base = { all: list.length };
    STATUSES.forEach((s) => {
      base[s] = list.filter((e) => e.status === s).length;
    });
    return base;
  }, [list]);

  return (
    <>
      <Notice kind="ok" text={note} onClose={() => setNote("")} />
      <Notice kind="err" text={error} onClose={() => setError("")} />

      <PanelCard
        title="Customer enquiries"
        subtitle="Every class enquiry from the website form and from the 3D assistant lands here."
        actions={
          <button type="button" className="adm-btn" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        }
      >
        <div className="adm-tabs adm-tabs--inline">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              className={filter === s ? "is-active" : ""}
              onClick={() => setFilter(s)}
            >
              {s} <span>{counts[s] || 0}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner label="Loading enquiries" />
        ) : shown.length ? (
          <div className="adm-rows">
            {shown.map((enq) => (
              <article className="adm-enq" key={enq.id}>
                <div className="adm-enq-top">
                  <div>
                    <strong>{enq.name}</strong>
                    <span className="adm-row-meta">
                      {enq.service || "Not specified"} · {fmtDate(enq.created_at)}
                    </span>
                  </div>
                  <span className={`adm-pill ${statusClass(enq.status)}`}>{enq.status}</span>
                </div>

                <div className="adm-enq-links">
                  <a href={`tel:${enq.phone}`}>
                    <i className="bi bi-telephone"></i> {enq.phone}
                  </a>
                  <a
                    href={`https://wa.me/${enq.whatsapp_number || enq.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-whatsapp"></i> WhatsApp
                  </a>
                  {enq.email ? (
                    <a href={`mailto:${enq.email}`}>
                      <i className="bi bi-envelope"></i> {enq.email}
                    </a>
                  ) : null}
                </div>

                {enq.message ? <p className="adm-enq-msg">“{enq.message}”</p> : null}

                <div className="adm-enq-actions">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`adm-btn ${enq.status === s ? "is-active" : ""}`}
                      onClick={() => setStatus(enq, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="adm-empty">No enquiries in this view.</p>
        )}

        <p className="adm-hint">
          Studio number: {COMPANY.phone}. Replies are sent from your own phone —
          WhatsApp automation (if configured) also pings {COMPANY.phone}.
        </p>
      </PanelCard>
    </>
  );
}
