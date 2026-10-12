import { supabase } from "./supabase";

const BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function accessToken() {
  const { data } = await supabase.auth.getSession(); // tự refresh nếu sắp hết hạn
  return data.session?.access_token || "";
}

export async function api(path, { method = "GET", params, body, raw = false } = {}) {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== "" && v != null),
      )
    : "";
  const res = await fetch(`${BASE}/admin/api${path}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) {
    if (!res.ok) throw new ApiError(res.status, "Tải file thất bại");
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || res.statusText);
  return data;
}

// CSV cần header Authorization nên không mở bằng link thường được -> fetch rồi tạo blob
export async function downloadCsv(params) {
  const res = await api("/leads.csv", { params, raw: true });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
