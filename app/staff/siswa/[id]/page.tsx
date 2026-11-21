import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { Badge } from "@/components/ui";
import { RecordPaymentForm } from "@/components/record-payment-form";

function formatDateTime(d: Date) {
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function StaffStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { staff } = await requireStaff();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: true,
      transactions: {
        where: { status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        include: { items: true },
        take: 100,
      },
      payments: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });

  if (!student || student.grha !== staff.grha) notFound();

  const spent = student.transactions.reduce((a, t) => a + t.totalRupiah, 0);
  const paid = student.payments.reduce((a, p) => a + p.amountRupiah, 0);
  const balance = paid - spent;

  return (
    <div className="space-y-6">
      <Link href="/staff" className="text-sm text-primary hover:underline">
        &lt;- Kembali ke daftar siswa
      </Link>

      <section className="kc-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">{student.user.fullName}</h2>
            <p className="kc-muted font-mono">{student.user.username}</p>
          </div>
          <div className="text-right">
            <p className="kc-muted">Status Kartu</p>
            <Badge variant={student.cardStatus === "ACTIVE" ? "active" : "blocked"}>
              {student.cardStatus === "ACTIVE" ? "Aktif" : "Diblokir"}
            </Badge>
            <p className="kc-muted mt-1 text-xs font-mono">
              {student.cardUid ?? "Belum ada kartu"}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <dt className="kc-muted">Total Belanja</dt>
            <dd className="font-medium">{formatRupiah(spent)}</dd>
          </div>
          <div>
            <dt className="kc-muted">Total Disetor</dt>
            <dd className="font-medium">{formatRupiah(paid)}</dd>
          </div>
          <div>
            <dt className="kc-muted">{balance >= 0 ? "Saldo" : "Sisa Tagihan"}</dt>
            <dd className={`font-medium ${balance < 0 ? "text-danger" : "text-success"}`}>
              {formatRupiah(Math.abs(balance))}
            </dd>
          </div>
        </dl>
      </section>

      <section className="kc-card p-5">
        <h3 className="text-lg font-semibold mb-1">Catat Setoran</h3>
        <p className="kc-muted mb-4">Catat uang yang kamu terima dari siswa ini.</p>
        <RecordPaymentForm studentId={student.id} />
      </section>

      <section className="kc-card p-5">
        <h3 className="text-lg font-semibold mb-3">Riwayat Setoran</h3>
        {student.payments.length === 0 ? (
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
                {student.payments.map((p) => (
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

      <section className="kc-card p-5">
        <h3 className="text-lg font-semibold mb-3">Riwayat Belanja</h3>
        {student.transactions.length === 0 ? (
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
                {student.transactions.map((t) => (
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
    </div>
  );
}
