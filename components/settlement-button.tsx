"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Grha } from "@prisma/client";

export function SettlementButton({
  grha,
  periodYear,
  periodMonth,
  totalRupiah,
}: {
  grha: Grha;
  periodYear: number;
  periodMonth: number;
  totalRupiah: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    if (
      !confirm(
        `Tandai tagihan bulan ini sebesar Rp ${totalRupiah.toLocaleString("id-ID")} sudah dibayar ke Business Center?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grha, periodYear, periodMonth }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal menandai pembayaran");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button className="kc-btn kc-btn-primary" onClick={markPaid} disabled={busy}>
        {busy ? "Memproses..." : "Tandai Sudah Dibayar"}
      </button>
      {error && <p className="kc-error mt-1">{error}</p>}
    </div>
  );
}
