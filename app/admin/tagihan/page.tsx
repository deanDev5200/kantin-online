import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { GRHA_LABELS } from "@/lib/constants";
import { SettlementButton } from "@/components/settlement-button";
import { AdjustSettlementButton } from "@/components/adjust-settlement-button";
import type { Grha } from "@prisma/client";

type MonthKey = string; // "YYYY-MM"

function monthKey(d: Date): MonthKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatMonthKey(key: MonthKey): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES_ID[m - 1]} ${y}`;
}

export default async function AdminBillsPage() {
  await requireAdmin();

  const transactions = await prisma.transaction.findMany({
    where: { status: "COMPLETED" },
    select: {
      totalRupiah: true,
      createdAt: true,
      student: { select: { grha: true } },
    },
  });

  // Aggregate: monthKey -> grha -> total
  const byMonth = new Map<MonthKey, Map<Grha, number>>();
  for (const t of transactions) {
    const key = monthKey(t.createdAt);
    let grhaMap = byMonth.get(key);
    if (!grhaMap) {
      grhaMap = new Map();
      byMonth.set(key, grhaMap);
    }
    const g = t.student.grha;
    grhaMap.set(g, (grhaMap.get(g) ?? 0) + t.totalRupiah);
  }

  const currentMonthKey = monthKey(new Date());
  const monthKeys = [...byMonth.keys()].sort().reverse();

  const settlements = await prisma.monthlySettlement.findMany();
  const settlementMap = new Map(
    settlements.map((s) => [
      `${s.grha}|${s.periodYear}-${String(s.periodMonth).padStart(2, "0")}`,
      s,
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tagihan Business Center</h2>
        <p className="kc-muted">
          Tandai tagihan bulanan tiap grha sebagai sudah dibayar ke Business Center.
        </p>
      </div>

      {monthKeys.length === 0 && (
        <section className="kc-card p-5">
          <p className="kc-muted">Belum ada transaksi.</p>
        </section>
      )}

      {monthKeys.map((key) => {
        const grhaMap = byMonth.get(key)!;
        const grhas = [...grhaMap.keys()].sort((a, b) =>
          GRHA_LABELS[a].localeCompare(GRHA_LABELS[b]),
        );
        const monthTotal = grhas.reduce((a, g) => a + (grhaMap.get(g) ?? 0), 0);
        return (
          <section key={key} className="kc-card p-5">
            <header className="mb-3 flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold">{formatMonthKey(key)}</h3>
                <p className="kc-muted">
                  Total seluruh grha: <strong>{formatRupiah(monthTotal)}</strong>
                </p>
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="kc-table">
                <thead>
                  <tr>
                    <th>Grha</th>
                    <th className="text-right">Total Tagihan</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {grhas.map((g) => {
                    const total = grhaMap.get(g) ?? 0;
                    const settlement = settlementMap.get(`${g}|${key}`);
                    const monthEnded = key < currentMonthKey;
                    const mismatch =
                      settlement != null && settlement.totalSpentRupiah !== total;
                    return (
                      <tr key={g}>
                        <td className="font-medium">{GRHA_LABELS[g]}</td>
                        <td className="text-right whitespace-nowrap">{formatRupiah(total)}</td>
                        <td>
                          {settlement ? (
                            mismatch ? (
                              <span
                                className="kc-badge"
                                style={{ background: "#fee2e2", color: "#991b1b" }}
                                title="Total transaksi berubah setelah tagihan ditandai lunas"
                              >
                                Perlu ditinjau
                              </span>
                            ) : (
                              <span className="kc-badge kc-badge-active">Sudah dibayar</span>
                            )
                          ) : (
                            <span
                              className="kc-badge"
                              style={{ background: "#fef3c7", color: "#92400e" }}
                            >
                              Belum dibayar
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          {settlement ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="kc-muted text-xs">
                                {mismatch ? (
                                  <>
                                    Dibayar {formatRupiah(settlement.totalSpentRupiah)} pada{" "}
                                  </>
                                ) : null}
                                {settlement.paidAt.toLocaleString("id-ID", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                              {mismatch && (
                                <AdjustSettlementButton
                                  grha={g}
                                  periodYear={Number(key.split("-")[0])}
                                  periodMonth={Number(key.split("-")[1])}
                                  previousRupiah={settlement.totalSpentRupiah}
                                  currentRupiah={total}
                                />
                              )}
                            </div>
                          ) : monthEnded ? (
                            <SettlementButton
                              grha={g}
                              periodYear={Number(key.split("-")[0])}
                              periodMonth={Number(key.split("-")[1])}
                              totalRupiah={total}
                            />
                          ) : (
                            <span className="kc-muted text-xs">
                              Bisa dibayar setelah bulan berakhir
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
