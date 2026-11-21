import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GRHA_LIST, GRHA_LABELS } from "@/lib/constants";

export default async function AdminGrhaPage() {
  await requireAdmin();

  const staff = await prisma.staff.findMany({
    include: { user: true },
    orderBy: { user: { fullName: "asc" } },
  });
  const studentCounts = await prisma.student.groupBy({
    by: ["grha"],
    _count: { _all: true },
  });
  const countMap = new Map(studentCounts.map((c) => [c.grha, c._count._all]));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Penugasan Grha</h2>
      <p className="kc-muted">
        Setiap grha memiliki tepat 2 Matta/Pitta. Ubah penugasan lewat halaman detail pengguna.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GRHA_LIST.map((g) => {
          const members = staff.filter((s) => s.grha === g);
          return (
            <div key={g} className="kc-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Grha {GRHA_LABELS[g]}</h3>
                <span className="kc-muted text-xs">{countMap.get(g) ?? 0} siswa</span>
              </div>
              <div>
                <p className="kc-muted text-xs uppercase tracking-wide">Matta/Pitta</p>
                {members.length === 0 ? (
                  <p className="text-sm text-danger">Belum ada</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {members.map((m) => (
                      <li key={m.id}>
                        <Link href={`/admin/users/${m.userId}`} className="text-primary hover:underline">
                          {m.user.fullName}
                        </Link>
                        <span className="kc-muted"> ({m.user.username})</span>
                      </li>
                    ))}
                  </ul>
                )}
                {members.length < 2 && (
                  <p className="kc-muted text-xs mt-1">Kurang {2 - members.length} Matta/Pitta</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
