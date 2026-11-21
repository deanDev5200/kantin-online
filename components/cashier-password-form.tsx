"use client";

import { useState } from "react";

const MIN_LENGTH = 6;

export function CashierPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (password.length < MIN_LENGTH) {
      setError(`Password kasir minimal ${MIN_LENGTH} karakter`);
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/settings/cashier-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan password kasir");
      return;
    }
    setSuccess("Password kasir berhasil diperbarui.");
    setPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <label className="kc-label">Password Kasir Baru</label>
        <input
          type="password"
          className="kc-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="kc-label">Konfirmasi Password</label>
        <input
          type="password"
          className="kc-input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="kc-error">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <button className="kc-btn kc-btn-primary" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan Password Kasir"}
      </button>
    </form>
  );
}
