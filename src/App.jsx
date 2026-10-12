import { lazy, Suspense } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import Login from "./pages/Login.jsx";

const Overview = lazy(() => import("./pages/Overview.jsx"));
const Leads = lazy(() => import("./pages/Leads.jsx"));
const Zns = lazy(() => import("./pages/Zns.jsx"));
const Live = lazy(() => import("./pages/Live.jsx"));
const Team = lazy(() => import("./pages/Team.jsx"));

const NAV = [
  ["/", "Tổng quan"],
  ["/leads", "Leads"],
  ["/zns", "ZNS"],
  ["/live", "Realtime"],
  ["/team", "Team"],
];

function Shell() {
  const { me, signOut } = useAuth();
  const u = me.user;
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Palm River<small>Admin</small></div>
        <nav>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="me">
          {u.avatar && <img src={u.avatar} alt="" referrerPolicy="no-referrer" />}
          <div>
            <b>{u.name || u.email}</b>
            <small>{u.email}</small>
            <small className="role">{u.role}</small>
          </div>
          <button className="ghost" onClick={signOut}>Đăng xuất</button>
        </div>
      </aside>
      <main className="main">
        <Suspense fallback={<div className="muted">Đang tải…</div>}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/zns" element={<Zns />} />
            <Route path="/live" element={<Live />} />
            <Route path="/team" element={<Team />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function Message({ title, children }) {
  return (
    <div className="center">
      <div className="login">
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const { state, session, signOut } = useAuth();
  if (state === "loading") return <div className="center muted">Đang tải…</div>;
  if (state === "anon") return <Login />;
  if (state === "denied")
    return (
      <Message title="Chưa được cấp quyền">
        <p>
          Tài khoản <b>{session?.user?.email}</b> chưa nằm trong danh sách admin.
          Hãy nhờ owner thêm email này ở trang Team.
        </p>
        <button onClick={signOut}>Dùng tài khoản khác</button>
      </Message>
    );
  if (state === "error")
    return (
      <Message title="Không kết nối được máy chủ">
        <p>Vui lòng thử lại sau ít phút.</p>
        <button onClick={() => window.location.reload()}>Tải lại</button>
      </Message>
    );
  return <Shell />;
}
