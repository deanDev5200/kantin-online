import { requireAdmin } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex-1 flex flex-col">
      <AppHeader
        title="Kantin Canggih"
        subtitle="Panel Admin"
        username={session.username}
        roleLabel="Admin"
        links={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/users", label: "Pengguna" },
          { href: "/admin/grha", label: "Penugasan Grha" },
          { href: "/admin/tagihan", label: "Tagihan" },
          { href: "/admin/settings", label: "Pengaturan" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 flex-1">{children}</main>
    </div>
  );
}
