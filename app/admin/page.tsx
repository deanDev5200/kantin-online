import Link from "next/link";
import { prisma } from "@/lib/db";

async function countByRole() {
  const [students, staff, admins] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STAFF" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);
  return { students, staff, admins };
}

export default async function AdminDashboardPage() {
  const [counts, txCount, txTotal] = await Promise.all([
    countByRole(),
    prisma.transaction.count({ where: { status: "COMPLETED" } }),
    prisma.transaction.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalRupiah: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kc-card p-4">
          <p className="kc-muted">Siswa</p>
          <p className="text-2xl font-bold">{counts.students}</p>
        </div>
        <div className="kc-card p-4">
          <p className="kc-muted">Guru/Staff (Matta/Pitta)</p>
          <p className="text-2xl font-bold">{counts.staff}</p>
        </div>
        <div className="kc-card p-4">
          <p className="kc-muted">Admin</p>
          <p className="text-2xl font-bold">{counts.admins}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="kc-card p-4">
          <p className="kc-muted">Transaksi Berhasil</p>
          <p className="text-2xl font-bold">{txCount}</p>
        </div>
        <div className="kc-card p-4">
          <p className="kc-muted">Total Nilai Transaksi</p>
          <p className="text-2xl font-bold">
            Rp {(txTotal._sum.totalRupiah ?? 0).toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-3">Pintasan</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className="kc-btn kc-btn-primary">
            Kelola Pengguna
          </Link>
          <Link href="/admin/users/import" className="kc-btn kc-btn-secondary">
            Impor Pengguna (Excel)
          </Link>
          <Link href="/admin/grha" className="kc-btn kc-btn-secondary">
            Penugasan Grha
          </Link>
          <Link href="/admin/tagihan" className="kc-btn kc-btn-secondary">
            Tagihan Bulanan
          </Link>
          <Link href="/admin/settings" className="kc-btn kc-btn-secondary">
            Pengaturan Kasir
          </Link>
        </div>
      </section>
    </div>
  );
}
