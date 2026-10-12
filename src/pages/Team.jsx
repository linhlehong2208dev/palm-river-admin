import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Card, Err, fmtTime, useFetch } from "../ui.jsx";

export default function Team() {
  const { me } = useAuth();
  const isOwner = me.user.role === "owner";
  const { data, error, reload } = useFetch("/admins");
  const [form, setForm] = useState({ email: "", name: "", role: "admin" });

  async function add(e) {
    e.preventDefault();
    try {
      await api("/admins", { method: "POST", body: form });
      setForm({ email: "", name: "", role: "admin" });
      reload();
    } catch (err) {
      alert(err.message);
    }
  }
  async function remove(email) {
    if (!confirm(`Thu hồi quyền của ${email}?`)) return;
    try {
      await api("/admins", { method: "DELETE", params: { email } });
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="page-h"><h2>Team</h2></div>
      <Err msg={error} />

      {isOwner && (
        <Card title="Thêm người dùng (đăng nhập bằng Google cùng email này)">
          <form className="inline" onSubmit={add}>
            <input required type="email" placeholder="email@..." value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Tên hiển thị" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">admin (xem + sửa)</option>
              <option value="viewer">viewer (chỉ xem)</option>
            </select>
            <button>Thêm</button>
          </form>
        </Card>
      )}

      <Card title="Danh sách">
        <table>
          <thead><tr><th>Email</th><th>Tên</th><th>Vai trò</th><th>Đăng nhập gần nhất</th><th></th></tr></thead>
          <tbody>
            {(data?.owners || []).map((o) => (
              <tr key={o}><td>{o}</td><td>—</td><td>owner</td><td>—</td><td></td></tr>
            ))}
            {(data?.rows || []).map((a) => (
              <tr key={a.email} className={a.active ? "" : "off"}>
                <td>{a.email}</td><td>{a.name || "—"}</td>
                <td>{a.active ? a.role : "đã thu hồi"}</td>
                <td>{fmtTime(a.last_login_ts)}</td>
                <td>{isOwner && a.active ? <button className="ghost" onClick={() => remove(a.email)}>Thu hồi</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Owner được khai báo bằng biến <code>ADMIN_EMAILS</code> trong wrangler.toml.</p>
      </Card>
    </>
  );
}
