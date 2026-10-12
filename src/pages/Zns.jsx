import { useState } from "react";
import { Card, Err, fmtNum, fmtPct, fmtTime, useFetch } from "../ui.jsx";

const rate = (a, b) => (b ? fmtPct(a / b) : "—");

export default function Zns() {
  const [days, setDays] = useState(30);
  const { data, error } = useFetch("/zns", { days }, { interval: 60_000 });

  return (
    <>
      <div className="page-h">
        <h2>ZNS</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value="7">7 ngày</option><option value="30">30 ngày</option><option value="90">90 ngày</option>
        </select>
      </div>
      <Err msg={error} />
      <Card title="Chiến dịch">
        <table>
          <thead>
            <tr><th>Chiến dịch</th><th>Tin</th><th>Gửi</th><th>Nhận</th><th>Bấm</th><th>CTR</th><th>Vào landing</th><th>Leads</th><th>Gần nhất</th></tr>
          </thead>
          <tbody>
            {(data?.campaigns || []).map((c) => (
              <tr key={c.campaign}>
                <td>{c.campaign}</td><td>{fmtNum(c.total)}</td><td>{fmtNum(c.sent)}</td>
                <td>{fmtNum(c.delivered)}</td><td>{fmtNum(c.clicked)}</td>
                <td>{rate(c.clicked, c.delivered || c.sent || c.total)}</td>
                <td>{fmtNum(c.landed)}</td><td>{fmtNum(c.leads)}</td><td>{fmtTime(c.last_ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Tin gần đây">
        <table>
          <thead><tr><th>Tạo lúc</th><th>SĐT</th><th>Tên</th><th>Chiến dịch</th><th>Trạng thái</th><th>Bấm</th><th>Lead</th></tr></thead>
          <tbody>
            {(data?.messages || []).map((m) => (
              <tr key={m.id}>
                <td>{fmtTime(m.created_ts)}</td><td>{m.phone_norm}</td><td>{m.name || "—"}</td>
                <td>{m.campaign || "—"}</td><td>{m.status}{m.error ? ` (${m.error})` : ""}</td>
                <td>{m.click_count}</td><td>{m.lead_name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
