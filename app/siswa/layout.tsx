import { requireStudent } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { GRHA_LABELS } from "@/lib/constants";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { student } = await requireStudent();

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title="Kantin Canggih"
        subtitle={`Siswa - Grha ${GRHA_LABELS[student.grha]}`}
        username={student.user.username}
        roleLabel="Siswa"
        links={[
          { href: "/siswa", label: "Riwayat Transaksi" },
          { href: "/siswa/kartu", label: "Kartu RFID" },
          { href: "/siswa/akun", label: "Akun" },
        ]}
      />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 flex-1">{children}</main>
    </div>
  );
}
