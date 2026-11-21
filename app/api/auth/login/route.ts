import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createUserSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });

  // Constant-ish response to avoid user enumeration.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  await createUserSession({ userId: user.id, role: user.role, username: user.username });
  return NextResponse.json({ role: user.role });
}
