import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { getSession, createUserSession } from "@/lib/session";
import { changeCredentialsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changeCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const { username, currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Password saat ini salah" }, { status: 401 });
  }

  const newUsername = username.toLowerCase();
  if (newUsername !== user.username) {
    const taken = await prisma.user.findUnique({ where: { username: newUsername } });
    if (taken) {
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      username: newUsername,
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    },
  });

  // Refresh session cookie with new username.
  await createUserSession({ userId: updated.id, role: updated.role, username: updated.username });

  return NextResponse.json({ ok: true, username: updated.username });
}
