import { requireAdmin } from "@/lib/auth";
import { CashierPasswordForm } from "@/components/cashier-password-form";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pengaturan</h2>

      <section className="kc-card p-5">
        <h3 className="font-semibold mb-1">Password Kasir</h3>
        <p className="kc-muted mb-4">
          Password bersama untuk membuka halaman kasir di <code className="font-mono">/bc/kasir</code>.
          Bagikan password ini hanya kepada petugas kasir Business Center.
        </p>
        <CashierPasswordForm />
      </section>

      <section className="kc-card p-5">
        <h3 className="font-semibold mb-1">Informasi</h3>
        <ul className="text-sm space-y-1 kc-muted">
          <li>Halaman kasir: <code className="font-mono">/bc/kasir</code></li>
          <li>Import pengguna: dari menu Pengguna &rarr; Impor Excel</li>
          <li>Penugasan grha: dari menu Penugasan Grha atau detail pengguna</li>
        </ul>
      </section>
    </div>
  );
}
