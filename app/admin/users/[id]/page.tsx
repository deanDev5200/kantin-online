import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminUserDetail } from "@/components/admin-user-detail";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { student: true, staff: true },
  });
  if (!user) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-sm text-primary hover:underline">
        &lt;- Kembali ke daftar pengguna
      </Link>

      <AdminUserDetail
        user={{
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          grha: user.student?.grha ?? user.staff?.grha ?? null,
          student: user.student
            ? {
                id: user.student.id,
                cardUid: user.student.cardUid,
                cardStatus: user.student.cardStatus,
                cardBlockReason: user.student.cardBlockReason,
                hasPin: Boolean(user.student.cardPinHash),
                monthlyLimitRupiah: user.student.monthlyLimitRupiah,
              }
            : null,
        }}
      />
    </div>
  );
}
