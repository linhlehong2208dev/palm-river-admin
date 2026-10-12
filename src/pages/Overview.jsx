import { useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Bars, Card, Err, Kpi, fmtDur, fmtNum, fmtPct, useFetch } from "../ui.jsx";

const RANGES = [[1, "Hôm nay"], [7, "7 ngày"], [30, "30 ngày"], [90, "90 ngày"]];
const cvr = (leads, visitors) => (visitors ? fmtPct(leads / visitors) : "—");

export default function Overview() {
  const [days, setDays] = useState(7);
  const { data: d, error, loading } = useFetch("/overview", { days }, { interval: 60_000 });

  return (
    <>
      <div className="page-h">
        <h2>Tổng quan</h2>
        <div className="seg">
          {RANGES.map(([v, l]) => (
            <button key={v} className={days === v ? "on" : ""} onClick={() => setDays(v)}>{l}</button>
          ))}
        </div>
      </div>
      <Err msg={error} />
      {!d ? (
        <div className="muted">{loading ? "Đang tải…" : ""}</div>
      ) : (
        <>
          <div className="kpis">
            <Kpi label="Lượt xem" value={fmtNum(d.totals.views)} />
            <Kpi label="Khách truy cập" value={fmtNum(d.totals.visitors)} />
            <Kpi label="Phiên" value={fmtNum(d.totals.sessions)} />
            <Kpi label="Leads" value={fmtNum(d.totals.leads)} sub="đã loại trùng/spam" />
            <Kpi label="Tỉ lệ chuyển đổi" value={fmtPct(d.totals.conversion)} sub="lead / khách" />
            <Kpi label="Thời gian TB" value={fmtDur(d.totals.avgSeconds)} />
          </div>

          <Card title="Theo ngày">
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={d.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="d" tickFormatter={(x) => x.slice(5)} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="views" name="Lượt xem" stroke="#94a3b8" dot={false} />
                  <Line dataKey="visitors" name="Khách" stroke="#2563eb" dot={false} />
                  <Line dataKey="leads" name="Leads" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid2">
            <Card title="Kênh">
              <table>
                <thead><tr><th>Kênh</th><th>Khách</th><th>Xem</th><th>Leads</th><th>CVR</th></tr></thead>
                <tbody>
                  {d.channels.map((c) => (
                    <tr key={c.channel}>
                      <td>{c.channel}</td><td>{fmtNum(c.visitors)}</td><td>{fmtNum(c.views)}</td>
                      <td>{fmtNum(c.leads)}</td><td>{cvr(c.leads, c.visitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card title="Funnel ZNS">
              <Bars
                items={[
                  { k: "Tạo link", v: d.zns.total }, { k: "Đã gửi", v: d.zns.sent },
                  { k: "Đã nhận", v: d.zns.delivered }, { k: "Bấm link", v: d.zns.clicked },
                  { k: "Vào landing", v: d.zns.landed }, { k: "Thành lead", v: d.zns.leads },
                ]}
              />
            </Card>
          </div>

          <Card title="Chiến dịch">
            <table>
              <thead><tr><th>Kênh</th><th>Source</th><th>Medium</th><th>Campaign</th><th>Khách</th><th>Leads</th></tr></thead>
              <tbody>
                {d.campaigns.map((c, i) => (
                  <tr key={i}>
                    <td>{c.channel}</td><td>{c.utm_source || "—"}</td><td>{c.utm_medium || "—"}</td>
                    <td>{c.utm_campaign || "—"}</td><td>{fmtNum(c.visitors)}</td><td>{fmtNum(c.leads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid3">
            <Card title="Section được xem (phiên)"><Bars items={d.sections} /></Card>
            <Card title="Độ sâu cuộn (phiên)"><Bars items={d.scroll} label={(k) => `≥ ${k}%`} /></Card>
            <Card title="Bấm CTA"><Bars items={d.ctas} /></Card>
            <Card title="Thiết bị"><Bars items={d.devices} /></Card>
            <Card title="Trình duyệt"><Bars items={d.browsers} /></Card>
            <Card title="Thành phố"><Bars items={d.cities} /></Card>
          </div>
        </>
      )}
    </>
  );
}
