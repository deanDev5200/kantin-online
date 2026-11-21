"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CashierLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cashier/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal masuk");
      return;
    }
    router.refresh();
  }

  return (
    <div className="kc-card p-5 max-w-sm">
      <h2 className="text-lg font-semibold mb-1">Masuk Kasir</h2>
      <p className="kc-muted mb-4">Masukkan password kasir yang diberikan admin.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="kc-label">Password Kasir</label>
          <input
            type="password"
            className="kc-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>
        {error && <p className="kc-error">{error}</p>}
        <button className="kc-btn kc-btn-primary w-full" disabled={busy}>
          {busy ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
