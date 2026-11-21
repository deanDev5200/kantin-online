import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/session";
import { setCardPinSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setCardPinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "PIN tidak valid" },
      { status: 400 },
    );
  }

  const student = await prisma.student.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "Data siswa tidak ditemukan" }, { status: 404 });
  }
  if (!student.cardUid) {
    return NextResponse.json({ error: "Kartu belum ditautkan oleh admin" }, { status: 400 });
  }

  const isChange = Boolean(student.cardPinHash);
  await prisma.student.update({
    where: { id: student.id },
    data: {
      cardPinHash: await hashPassword(parsed.data.pin),
      pinAttempts: 0,
      cardStatus: "ACTIVE",
      cardBlockReason: null,
    },
  });

  await audit({
    action: isChange ? "card.pin.change" : "card.pin.create",
    entityType: "Student",
    entityId: student.id,
  });

  return NextResponse.json({ ok: true });
}
