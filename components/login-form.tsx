"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.ok) {
        window.location.href = "/";
        return;
      }

      if (res.status === 429) setError("尝试过于频繁，请稍后再试。");
      else if (res.status === 401) setError("无法登录。");
      else if (data.error) setError(data.error);
      else setError("暂时无法登录，请稍后重试。");
    } catch {
      setError("网络错误，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-slate-800">Lab Consumption</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="text-sm font-medium text-slate-700">通行口令</label>
          <input
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-3 text-lg outline-none ring-blue-500 focus:ring-2"
            placeholder="请输入"
            disabled={busy}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !passcode}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            登录
          </button>
        </form>
        <p className="mt-6 text-xs text-slate-500 leading-relaxed">
          登录后将同步物料列表，开始记录消耗。
        </p>
      </div>
    </main>
  );
}
