import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword, generateRandomPassword } from "@/lib/password";
import { GENERATED_PASSWORD_LENGTH } from "@/lib/constants";
import { audit } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

  const plainPassword = generateRandomPassword(GENERATED_PASSWORD_LENGTH);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(plainPassword) },
  });

  await audit({
    action: "admin.user.reset_password",
    entityType: "User",
    entityId: id,
    metadata: { username: user.username },
  });

  return NextResponse.json({ ok: true, plainPassword });
}
