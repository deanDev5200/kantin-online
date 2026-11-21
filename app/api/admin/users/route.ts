import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { createUserSchema } from "@/lib/validation";
import { createAccount } from "@/lib/account-creation";

async function requireAdminApi() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET(request: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const role = url.searchParams.get("role") ?? undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(role && ["STUDENT", "STAFF", "ADMIN"].includes(role)
        ? { role: role as "STUDENT" | "STAFF" | "ADMIN" }
        : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { fullName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { student: true, staff: true },
    take: 500,
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  try {
    const result = await createAccount({
      fullName: parsed.data.fullName,
      role: parsed.data.role as "STUDENT" | "STAFF" | "ADMIN",
      grha: parsed.data.grha as never,
    });
    return NextResponse.json({
      ok: true,
      userId: result.userId,
      username: result.username,
      plainPassword: result.plainPassword,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat akun";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
