import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { GRHA_LABELS } from "@/lib/constants";
import { PrintButton } from "@/components/print-button";

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

export default async function StaffReportPage() {
  const { staff } = await requireStaff();

  // Fetch all completed transactions for students in this grha.
  const transactions = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      student: { grha: staff.grha },
    },
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: true } },
    },
  });

  // Aggregate per month.
  type MonthAgg = { key: MonthKey; total: number; perStudent: Map<string, number> };
  const months = new Map<MonthKey, MonthAgg>();
  for (const t of transactions) {
    const key = monthKey(t.createdAt);
    let agg = months.get(key);
    if (!agg) {
      agg = { key, total: 0, perStudent: new Map() };
      months.set(key, agg);
    }
    agg.total += t.totalRupiah;
    agg.perStudent.set(
      t.studentId,
      (agg.perStudent.get(t.studentId) ?? 0) + t.totalRupiah,
    );
  }

  const monthKeys = [...months.keys()].sort().reverse();

  const settlements = await prisma.monthlySettlement.findMany({
    where: { grha: staff.grha },
  });
  const settlementMap = new Map(
    settlements.map((s) => [`${s.periodYear}-${String(s.periodMonth).padStart(2, "0")}`, s]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-lg font-semibold">Laporan Grha {GRHA_LABELS[staff.grha]}</h2>
        <PrintButton />
      </div>

      {monthKeys.length === 0 && (
        <section className="kc-card p-5 no-print">
          <p className="kc-muted">Belum ada transaksi untuk grha ini.</p>
        </section>
      )}

      {monthKeys.map((key) => {
        const agg = months.get(key)!;
        const settlement = settlementMap.get(key);
        return (
          <section key={key} className="kc-card p-5">
            <header className="flex items-start justify-between gap-4 flex-wrap mb-3">
              <div>
                <h3 className="text-lg font-semibold">{formatMonthKey(key)}</h3>
                <p className="kc-muted">
                  Total tagihan ke Business Center: <strong>{formatRupiah(agg.total)}</strong>
                </p>
              </div>
              <div className="no-print">
                {settlement ? (
                  <span className="kc-badge kc-badge-active">Sudah dibayar</span>
                ) : (
                  <span className="kc-badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                    Belum dibayar
                  </span>
                )}
              </div>
            </header>

            <div className="overflow-x-auto">
              <table className="kc-table">
                <thead>
                  <tr>
                    <th>Nama Siswa</th>
                    <th>Username</th>
                    <th className="text-right">Total Belanja Bulan Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((t) => monthKey(t.createdAt) === key)
                    .reduce<Array<{ id: string; name: string; username: string; total: number }>>(
                      (acc, t) => {
                        const existing = acc.find((x) => x.id === t.studentId);
                        if (existing) {
                          existing.total += t.totalRupiah;
                        } else {
                          acc.push({
                            id: t.studentId,
                            name: t.student.user.fullName,
                            username: t.student.user.username,
                            total: t.totalRupiah,
                          });
                        }
                        return acc;
                      },
                      [],
                    )
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td className="font-mono text-xs">{row.username}</td>
                        <td className="text-right">{formatRupiah(row.total)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {settlement && (
              <p className="kc-muted mt-3">
                Dibayar pada {settlement.paidAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                {settlement.note ? ` - ${settlement.note}` : ""}
              </p>
            )}
          </section>
        );
      })}

      <p className="kc-muted text-sm no-print">
        Gunakan tombol Cetak di atas untuk mencetak laporan ini.
      </p>
    </div>
  );
}
