"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah, parseRupiahInput } from "@/lib/money";

export function MonthlyLimitForm({ initialLimit }: { initialLimit: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initialLimit == null ? "" : String(initialLimit));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const trimmed = value.trim();
    const payload = trimmed === "" ? null : parseRupiahInput(trimmed);
    if (trimmed !== "" && payload == null) {
      setError("Nominal tidak valid");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/settings/monthly-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyLimitRupiah: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan limit");
      return;
    }
    setSuccess(
      data.monthlyLimitRupiah == null
        ? "Limit bulanan dihapus."
        : `Limit bulanan diset ke ${formatRupiah(data.monthlyLimitRupiah)}.`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm">
      <div>
        <label className="kc-label">Limit Bulanan Global (Rp)</label>
        <input
          className="kc-input"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Kosongkan untuk tanpa limit"
        />
        <p className="kc-muted mt-1">
          Berlaku untuk semua siswa. Kosongkan (atau isi 0) untuk menonaktifkan limit.
        </p>
      </div>
      {error && <p className="kc-error">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <button className="kc-btn kc-btn-primary" disabled={busy}>
        {busy ? "Menyimpan..." : "Simpan Limit"}
      </button>
    </form>
  );
}
