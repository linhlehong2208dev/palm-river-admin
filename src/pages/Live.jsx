import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Card, fmtTime } from "../ui.jsx";

const ICON = { pageview: "👁", cta_click: "👆", form_start: "✍️", zns_click: "💬", lead: "🔔", zalo: "🟦" };

function describe(e) {
  if (e.type === "pageview") return `Xem ${e.path || "/"}`;
  if (e.type === "cta_click") return `Bấm CTA: ${e.label || "?"}`;
  if (e.type === "form_start") return `Bắt đầu điền form`;
  if (e.type === "zns_click") return `Bấm link ZNS: ${e.label || ""}`;
  return e.type;
}

export default function Live() {
  const [feed, setFeed] = useState([]);
  const [online, setOnline] = useState(0);
  const cursor = useRef({});

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { e, z, l } = cursor.current;
        const r = await api("/live", { params: { e, z, l } });
        if (!alive) return;
        cursor.current = r.cursor;
        setOnline(r.online);
        const items = [
          ...r.events.map((x) => ({
            key: "e" + x.id, ts: x.ts, kind: x.type,
            text: describe(x),
            meta: [x.channel, x.utm_campaign, x.device, x.city].filter(Boolean).join(" · "),
          })),
          ...r.leads.map((x) => ({
            key: "l" + x.id, ts: x.ts, kind: "lead",
            text: `LEAD: ${x.name} — ${x.phone}${x.dup_of ? " (trùng)" : ""}`,
            meta: [x.channel, x.utm_campaign, x.apartment_types].filter(Boolean).join(" · "),
          })),
          ...r.zalo.map((x) => ({
            key: "z" + x.id, ts: x.ts, kind: "zalo", text: `Zalo OA: ${x.event_name}`, meta: "",
          })),
        ].sort((a, b) => b.ts - a.ts);
        setFeed((old) => {
          const seen = new Set(old.map((x) => x.key));
          return [...items.filter((x) => !seen.has(x.key)), ...old].slice(0, 200);
        });
      } catch {
        /* bỏ qua lỗi mạng tạm thời, lần poll sau thử lại */
      }
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <>
      <div className="page-h">
        <h2>Realtime</h2>
        <div className="pill">🟢 {online} người online (5 phút)</div>
      </div>
      <Card>
        <ul className="feed">
          {feed.map((x) => (
            <li key={x.key} className={x.kind === "lead" ? "hot" : ""}>
              <time>{fmtTime(x.ts)}</time>
              <span>{ICON[x.kind] || "•"} {x.text}</span>
              {x.meta && <small>{x.meta}</small>}
            </li>
          ))}
          {!feed.length && <li className="muted">Đang chờ hoạt động…</li>}
        </ul>
      </Card>
    </>
  );
}
