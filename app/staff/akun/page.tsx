import { requireStaff } from "@/lib/auth";
import { GRHA_LABELS } from "@/lib/constants";
import { CredentialsForm } from "@/components/credentials-form";

export default async function StaffAccountPage() {
  const { staff } = await requireStaff();

  return (
    <div className="space-y-6">
      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-3">Data Diri</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="kc-muted">Nama Lengkap</dt>
            <dd className="font-medium">{staff.user.fullName}</dd>
          </div>
          <div>
            <dt className="kc-muted">Grha</dt>
            <dd className="font-medium">{GRHA_LABELS[staff.grha]}</dd>
          </div>
          <div>
            <dt className="kc-muted">Peran</dt>
            <dd className="font-medium">Matta/Pitta</dd>
          </div>
        </dl>
        <p className="kc-muted mt-4">
          Perubahan data diri dan penugasan grha hanya dapat dilakukan oleh admin.
        </p>
      </section>

      <section className="kc-card p-5">
        <h2 className="text-lg font-semibold mb-1">Data Login</h2>
        <p className="kc-muted mb-4">Ubah username dan/atau password akunmu.</p>
        <CredentialsForm currentUsername={staff.user.username} />
      </section>
    </div>
  );
}
