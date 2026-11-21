import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "block" && action !== "unblock") {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "Data siswa tidak ditemukan" }, { status: 404 });
  }

  if (action === "block") {
    await prisma.student.update({
      where: { id: student.id },
      data: { cardStatus: "BLOCKED", cardBlockReason: "MANUAL" },
    });
  } else {
    // Only the owner (or admin, via a separate route) may unblock.
    await prisma.student.update({
      where: { id: student.id },
      data: { cardStatus: "ACTIVE", cardBlockReason: null, pinAttempts: 0 },
    });
  }

  await audit({
    action: action === "block" ? "card.block" : "card.unblock",
    entityType: "Student",
    entityId: student.id,
  });

  return NextResponse.json({ ok: true });
}
