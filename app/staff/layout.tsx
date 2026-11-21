import { requireStaff } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { GRHA_LABELS } from "@/lib/constants";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { staff } = await requireStaff();

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title="Kantin Canggih"
        subtitle={`Matta/Pitta - Grha ${GRHA_LABELS[staff.grha]}`}
        username={staff.user.username}
        roleLabel="Matta/Pitta"
        links={[
          { href: "/staff", label: "Siswa Grha" },
          { href: "/staff/laporan", label: "Laporan Bulanan" },
          { href: "/staff/akun", label: "Akun" },
        ]}
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 flex-1">{children}</main>
    </div>
  );
}
