import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const { id } = await params;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }

  const data: {
    cardUid?: string | null;
    cardStatus?: "ACTIVE" | "BLOCKED";
    cardBlockReason?: "MANUAL" | "PIN_ATTEMPTS" | null;
    pinAttempts?: number;
  } = {};

  if ("cardUid" in body) {
    const raw = body.cardUid;
    if (raw === null || raw === "") {
      data.cardUid = null;
    } else if (typeof raw === "string") {
      const uid = raw.trim();
      // Reject if another student already has this UID.
      const existing = await prisma.student.findUnique({ where: { cardUid: uid } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "UID kartu sudah dipakai siswa lain" }, { status: 409 });
      }
      data.cardUid = uid;
    } else {
      return NextResponse.json({ error: "UID kartu tidak valid" }, { status: 400 });
    }
  }

  if ("cardStatus" in body) {
    if (body.cardStatus === "BLOCKED") {
      data.cardStatus = "BLOCKED";
      data.cardBlockReason = "MANUAL";
    } else if (body.cardStatus === "ACTIVE") {
      data.cardStatus = "ACTIVE";
      data.cardBlockReason = null;
      data.pinAttempts = 0;
    } else {
      return NextResponse.json({ error: "Status kartu tidak valid" }, { status: 400 });
    }
  }

  await prisma.student.update({ where: { id }, data });

  if ("cardUid" in body) {
    await audit({
      action: "admin.card.link",
      entityType: "Student",
      entityId: id,
      metadata: { cardLast4: data.cardUid ? data.cardUid.slice(-4) : null },
    });
  }
  if ("cardStatus" in body) {
    await audit({
      action: data.cardStatus === "BLOCKED" ? "admin.card.block" : "admin.card.unblock",
      entityType: "Student",
      entityId: id,
    });
  }

  return NextResponse.json({ ok: true });
}
