"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Grha } from "@prisma/client";

export function AdjustSettlementButton({
  grha,
  periodYear,
  periodMonth,
  previousRupiah,
  currentRupiah,
}: {
  grha: Grha;
  periodYear: number;
  periodMonth: number;
  previousRupiah: number;
  currentRupiah: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function adjust() {
    if (
      !confirm(
        `Sesuaikan tagihan dari Rp ${previousRupiah.toLocaleString(
          "id-ID",
        )} menjadi Rp ${currentRupiah.toLocaleString("id-ID")}?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/settlements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grha, periodYear, periodMonth }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menyesuaikan tagihan");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button className="kc-btn kc-btn-secondary" onClick={adjust} disabled={busy}>
        {busy ? "Memproses..." : "Sesuaikan Tagihan"}
      </button>
      {error && <p className="kc-error mt-1">{error}</p>}
    </div>
  );
}
