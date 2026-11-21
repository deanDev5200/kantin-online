import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { GRHA_LABELS } from "@/lib/constants";

export default async function StaffStudentsPage() {
  const { staff } = await requireStaff();

  const students = await prisma.student.findMany({
    where: { grha: staff.grha },
    orderBy: { user: { fullName: "asc" } },
    include: {
      user: true,
      transactions: { where: { status: "COMPLETED" }, select: { totalRupiah: true } },
      payments: { select: { amountRupiah: true } },
    },
  });

  const rows = students.map((s) => {
    const spent = s.transactions.reduce((a, t) => a + t.totalRupiah, 0);
    const paid = s.payments.reduce((a, p) => a + p.amountRupiah, 0);
    return {
      id: s.id,
      fullName: s.user.fullName,
      username: s.user.username,
      cardStatus: s.cardStatus,
      spent,
      paid,
      balance: paid - spent,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Siswa Grha {GRHA_LABELS[staff.grha]}</h2>
        <span className="kc-muted">{rows.length} siswa</span>
      </div>

      <section className="kc-card p-5">
        {rows.length === 0 ? (
          <p className="kc-muted">Belum ada siswa di grha ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="kc-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Kartu</th>
                  <th className="text-right">Total Belanja</th>
                  <th className="text-right">Total Disetor</th>
                  <th className="text-right">Saldo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.fullName}</td>
                    <td className="font-mono text-xs">{r.username}</td>
                    <td>
                      {r.cardStatus === "ACTIVE" ? (
                        <span className="kc-badge kc-badge-active">Aktif</span>
                      ) : (
                        <span className="kc-badge kc-badge-blocked">Diblokir</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">{formatRupiah(r.spent)}</td>
                    <td className="text-right whitespace-nowrap">{formatRupiah(r.paid)}</td>
                    <td
                      className={`text-right whitespace-nowrap font-medium ${
                        r.balance < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {formatRupiah(Math.abs(r.balance))}
                      {r.balance < 0 ? " (tagihan)" : ""}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/staff/siswa/${r.id}`}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        Kelola
                      </Link>
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
