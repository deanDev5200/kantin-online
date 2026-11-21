import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { updateUserSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

async function requireAdminApi() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { student: true, staff: true },
  });
  if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  const prevFullName = user.fullName;
  const prevGrha = user.student?.grha ?? user.staff?.grha ?? null;

  // Update fullName always.
  await prisma.user.update({ where: { id }, data: { fullName: parsed.data.fullName } });

  // Update grha only for student/staff when provided.
  if (parsed.data.grha) {
    if (user.student) {
      await prisma.student.update({
        where: { id: user.student.id },
        data: { grha: parsed.data.grha },
      });
    } else if (user.staff) {
      // Enforce max 2 Matta/Pitta per grha.
      if (user.staff.grha !== parsed.data.grha) {
        const count = await prisma.staff.count({ where: { grha: parsed.data.grha } });
        if (count >= 2) {
          return NextResponse.json(
            { error: `Grha ${parsed.data.grha} sudah memiliki 2 Matta/Pitta` },
            { status: 400 },
          );
        }
      }
      await prisma.staff.update({
        where: { id: user.staff.id },
        data: { grha: parsed.data.grha },
      });
    }
  }

  await audit({
    action: "admin.user.update",
    entityType: "User",
    entityId: id,
    metadata: {
      fullName: { from: prevFullName, to: parsed.data.fullName },
      grha: { from: prevGrha, to: parsed.data.grha ?? prevGrha },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  await audit({
    action: "admin.user.delete",
    entityType: "User",
    entityId: id,
    metadata: { username: user.username, fullName: user.fullName, role: user.role },
  });
  return NextResponse.json({ ok: true });
}
