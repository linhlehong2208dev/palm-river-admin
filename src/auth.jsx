import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { api } from "./api";

const APP_REDIRECT_URL = (
  import.meta.env.VITE_APP_URL || window.location.origin
).replace(/\/+$/, "");

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// state: loading | anon | denied | error | ok
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [me, setMe] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id;
  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      setMe(null);
      setState("anon");
      return;
    }
    let alive = true;
    setState("loading");
    api("/me")
      .then((r) => alive && (setMe(r), setState("ok")))
      .catch((e) => {
        if (!alive) return;
        if (e.status === 401) return supabase.auth.signOut(); // token hỏng -> về màn đăng nhập
        setState(e.status === 403 ? "denied" : "error");
      });
    return () => {
      alive = false;
    };
    // chỉ chạy lại khi đổi người dùng, không chạy lại mỗi lần refresh token
  }, [uid, session === undefined]);

  const value = {
    state,
    me,
    session,
    signIn: () =>
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: APP_REDIRECT_URL,
          queryParams: { prompt: "select_account" },
        },
      }),
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
