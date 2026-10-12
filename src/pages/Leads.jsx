import { useEffect, useState } from "react";
import { api, downloadCsv } from "../api.js";
import { useAuth } from "../auth.jsx";
import {
  Badge, CHANNELS, Card, Err, STATUSES, fmtTime, statusLabel, useFetch,
} from "../ui.jsx";

const PAGE = 30;

export default function Leads() {
  const [qInput, setQInput] = useState("");
  const [f, setF] = useState({ q: "", status: "", channel: "", days: "30" });
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);

  // debounce ô tìm kiếm
  useEffect(() => {
    const t = setTimeout(() => (setF((x) => ({ ...x, q: qInput })), setPage(0)), 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const set = (k) => (e) => (setF((x) => ({ ...x, [k]: e.target.value })), setPage(0));
  const { data, error, reload } = useFetch("/leads", { ...f, limit: PAGE, offset: page * PAGE }, { interval: 30_000 });
  const total = data?.total || 0;

  return (
    <>
      <div className="page-h">
        <h2>Leads <span className="muted">({total})</span></h2>
        <button className="ghost" onClick={() => downloadCsv(f).catch((e) => alert(e.message))}>Xuất CSV</button>
      </div>

      <div className="filters">
        <input placeholder="Tìm tên / SĐT / email" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        <select value={f.status} onChange={set("status")}>
          <option value="">Mọi trạng thái</option>
          {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={f.channel} onChange={set("channel")}>
          <option value="">Mọi kênh</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={f.days} onChange={set("days")}>
          <option value="1">Hôm nay</option><option value="7">7 ngày</option>
          <option value="30">30 ngày</option><option value="90">90 ngày</option>
          <option value="365">365 ngày</option>
        </select>
      </div>

      <Err msg={error} />
      <Card>
        <table className="click">
          <thead>
            <tr><th>Thời gian</th><th>Họ tên</th><th>SĐT</th><th>Nhu cầu</th><th>Kênh</th><th>Trạng thái</th><th>Phụ trách</th></tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((r) => (
              <tr key={r.id} onClick={() => setOpenId(r.id)}>
                <td>{fmtTime(r.ts)}</td>
                <td>{r.name}{r.dup_of ? <span className="tag warn">trùng</span> : null}</td>
                <td>{r.phone}</td>
                <td>{r.apartment_types || "—"}</td>
                <td>{r.channel || "direct"}{r.utm_campaign ? <small> · {r.utm_campaign}</small> : null}</td>
                <td><Badge status={r.status} /></td>
                <td>{r.assigned_to || "—"}</td>
              </tr>
            ))}
            {data && !data.rows.length && <tr><td colSpan="7" className="muted">Không có lead nào</td></tr>}
          </tbody>
        </table>
        <div className="pager">
          <button className="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Trước</button>
          <span>{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} / ${total}` : "0"}</span>
          <button className="ghost" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Sau ›</button>
        </div>
      </Card>

      {openId && <Drawer id={openId} onClose={() => setOpenId(null)} onSaved={reload} />}
    </>
  );
}

function Drawer({ id, onClose, onSaved }) {
  const { me } = useAuth();
  const canEdit = me.user.role !== "viewer";
  const { data, loading, reload } = useFetch(`/leads/${id}`);
  const admins = useFetch("/admins");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.lead)
      setForm({
        status: data.lead.status,
        assigned_to: data.lead.assigned_to || "",
        note: data.lead.note || "",
      });
  }, [data?.lead?.id, data?.lead?.updated_ts]); // eslint-disable-line

  async function save() {
    setSaving(true);
    try {
      await api(`/leads/${id}`, { method: "PATCH", body: form });
      await reload();
      onSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const l = data?.lead;
  const people = (admins.data?.rows || []).filter((a) => a.active);
  return (
    <div className="drawer-bg" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>{l ? l.name : "Chi tiết lead"}</h3>
          <button className="ghost" onClick={onClose}>✕</button>
        </header>
        {loading || !l || !form ? (
          <div className="muted">Đang tải…</div>
        ) : (
          <>
            <dl>
              <dt>SĐT</dt>
              <dd>
                <a href={`tel:${l.phone_norm}`}>{l.phone}</a>{" · "}
                <a href={`https://zalo.me/${l.phone_norm}`} target="_blank" rel="noreferrer">Zalo</a>
              </dd>
              <dt>Email</dt><dd>{l.email || "—"}</dd>
              <dt>Nhu cầu</dt><dd>{l.apartment_types || "—"}</dd>
              <dt>Lời nhắn</dt><dd>{l.message || "—"}</dd>
              <dt>Gửi lúc</dt><dd>{fmtTime(l.ts)} · {l.form_type || "—"}</dd>
              <dt>Nguồn</dt>
              <dd>
                {l.channel || "direct"}
                {l.utm_source ? ` · ${l.utm_source}/${l.utm_medium || "-"}` : ""}
                {l.utm_campaign ? ` · ${l.utm_campaign}` : ""}
                {l.zns_match ? ` · ZNS (${l.zns_match})` : ""}
              </dd>
              <dt>Thiết bị</dt><dd>{[l.device, l.browser, l.city].filter(Boolean).join(" · ") || "—"}</dd>
            </dl>

            <h4>Xử lý</h4>
            <div className="form">
              <label>Trạng thái
                <select disabled={!canEdit} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Phụ trách
                <select disabled={!canEdit} value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">— chưa giao —</option>
                  {people.map((a) => <option key={a.email} value={a.email}>{a.name || a.email}</option>)}
                  {(admins.data?.owners || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  {form.assigned_to && ![...people.map((a) => a.email), ...(admins.data?.owners || [])].includes(form.assigned_to) && (
                    <option value={form.assigned_to}>{form.assigned_to}</option>
                  )}
                </select>
              </label>
              <label>Ghi chú
                <textarea rows="4" disabled={!canEdit} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>
              {canEdit && <button onClick={save} disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</button>}
            </div>

            {data.zns && (
              <>
                <h4>Tin ZNS</h4>
                <p className="muted">
                  {data.zns.campaign || "(không tên)"} · {data.zns.status} · bấm {data.zns.click_count} lần
                </p>
              </>
            )}

            <h4>Hành trình ({data.journey.length})</h4>
            <ul className="timeline">
              {data.journey.map((e, i) => (
                <li key={i}>
                  <time>{fmtTime(e.ts)}</time>
                  <b>{e.type}</b> {e.label || e.path || ""}
                  {e.channel ? <small> · {e.channel}</small> : null}
                </li>
              ))}
              {!data.journey.length && <li className="muted">Không có dữ liệu hành trình</li>}
            </ul>

            <h4>Lịch sử chỉnh sửa</h4>
            <ul className="timeline">
              {data.logs.map((g, i) => (
                <li key={i}>
                  <time>{fmtTime(g.ts)}</time>
                  <b>{g.actor}</b> đổi <i>{g.field}</i>:{" "}
                  {g.field === "status" ? `${statusLabel(g.old_value)} → ${statusLabel(g.new_value)}` : `"${g.old_value || ""}" → "${g.new_value || ""}"`}
                </li>
              ))}
              {!data.logs.length && <li className="muted">Chưa có chỉnh sửa</li>}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
