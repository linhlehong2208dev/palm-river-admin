import { useAuth } from "../auth.jsx";

export default function Login() {
  const { signIn } = useAuth();
  return (
    <div className="center">
      <div className="login">
        <h1>Palm River Admin</h1>
        <p className="muted">Đăng nhập bằng tài khoản Google đã được cấp quyền.</p>
        <button onClick={signIn}>Đăng nhập bằng Google</button>
      </div>
    </div>
  );
}
