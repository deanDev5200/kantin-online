import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";

function formatDateTime(d: Date) {
  return d.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function StudentHistoryPage() {
  const { student } = await requireStudent();

  const [transactions, payments] = await Promise.all([
    prisma.transaction.findMany({
      where: { studentId: student.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 100,
    }),
    prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const totalSpent = transactions.reduce((sum, t) => sum + t.totalRupiah, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amountRupiah, 0);
  const balance = totalPaid - totalSpent; // positive = saldo lebih, negative = masih harus dibayar

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kc-card p-4">
          <p className="kc-muted">Total Belanja</p>
          <p className="text-xl font-bold">{formatRupiah(totalSpent)}</p>
        </div>
        <div className="kc-card p-4">
          <p className="kc-muted">Total Disetor</p>
          <p className="text-xl font-bold">{formatRupiah(totalPaid)}</p>
        </div>
        <div className="kc-card p-4">
          <p className="kc-muted">{balance >= 0 ? "Saldo" : "Sisa Tagihan"}</p>
          <p className={`text-xl font-bold ${balance < 0 ? "text-danger" : "text-success"}`}>
            {formatRupiah(Math.abs(balance))}
          </p>
        </div>
      </div>

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-3">Riwayat Transaksi</h2>
        {transactions.length === 0 ? (
          <p className="kc-muted">Belum ada transaksi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Item</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                    <td>
                      <ul className="space-y-0.5">
                        {t.items.map((it) => (
                          <li key={it.id}>
                            {it.name} x {it.quantity} - {formatRupiah(it.subtotalRupiah)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="text-right whitespace-nowrap font-medium">
                      {formatRupiah(t.totalRupiah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-3">Riwayat Setoran</h2>
        {payments.length === 0 ? (
          <p className="kc-muted">Belum ada setoran.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Catatan</th>
                  <th className="text-right">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</td>
                    <td>{p.note || "-"}</td>
                    <td className="text-right whitespace-nowrap font-medium">
                      {formatRupiah(p.amountRupiah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
