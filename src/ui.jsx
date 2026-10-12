import { useEffect, useRef, useState } from "react";
import { api } from "./api";

/* ---------- format ---------- */
export const fmtNum = (n) => new Intl.NumberFormat("vi-VN").format(n ?? 0);
export const fmtPct = (x) => ((x || 0) * 100).toFixed(1) + "%";
export const fmtDur = (s) => (s >= 60 ? `${Math.floor(s / 60)}p ${s % 60}s` : `${s || 0}s`);
export const fmtTime = (ts) =>
  ts
    ? new Date(ts).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour12: false,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const STATUSES = [
  ["new", "Mới"],
  ["contacted", "Đã liên hệ"],
  ["qualified", "Tiềm năng"],
  ["appointment", "Hẹn gặp"],
  ["won", "Chốt"],
  ["lost", "Mất"],
  ["spam", "Spam"],
];
export const statusLabel = (s) => STATUSES.find(([k]) => k === s)?.[1] || s;
export const CHANNELS = [
  "zns", "zalo", "facebook", "google_ads", "tiktok", "youtube",
  "organic", "referral", "direct", "campaign", "paid_other",
];

/* ---------- hook gọi API (có polling) ---------- */
export function useFetch(path, params = {}, { interval = 0 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const runRef = useRef(null);
  const key = JSON.stringify([path, params]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await api(path, { params });
        if (alive) (setData(r), setError(null));
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    };
    runRef.current = run;
    setLoading(true);
    run();
    const t = interval ? setInterval(run, interval) : null;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, interval]);

  return { data, error, loading, reload: () => runRef.current?.() };
}

/* ---------- component nhỏ ---------- */
export const Card = ({ title, right, children }) => (
  <section className="card">
    {(title || right) && (
      <header className="card-h">
        <h3>{title}</h3>
        <div>{right}</div>
      </header>
    )}
    {children}
  </section>
);

export const Kpi = ({ label, value, sub }) => (
  <div className="kpi">
    <div className="kpi-l">{label}</div>
    <div className="kpi-v">{value}</div>
    {sub && <div className="kpi-s">{sub}</div>}
  </div>
);

export const Badge = ({ status }) => <span className={`badge b-${status}`}>{statusLabel(status)}</span>;

// Danh sách thanh ngang: items = [{k, v}]
export function Bars({ items = [], label = (k) => k }) {
  const max = Math.max(1, ...items.map((i) => i.v));
  if (!items.length) return <div className="muted">Chưa có dữ liệu</div>;
  return (
    <ul className="bars">
      {items.map((i) => (
        <li key={i.k}>
          <span className="bars-k">{label(i.k)}</span>
          <span className="bars-t">
            <i style={{ width: `${(i.v / max) * 100}%` }} />
          </span>
          <span className="bars-v">{fmtNum(i.v)}</span>
        </li>
      ))}
    </ul>
  );
}

export const Err = ({ msg }) => (msg ? <div className="err">Lỗi: {msg}</div> : null);
