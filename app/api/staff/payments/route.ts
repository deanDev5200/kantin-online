import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { recordPaymentSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "STAFF") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const staff = await prisma.staff.findUnique({ where: { userId: session.userId } });
  if (!staff) {
    return NextResponse.json({ error: "Data Matta/Pitta tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = recordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const { studentId, amountRupiah, note } = parsed.data;
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  }
  if (student.grha !== staff.grha) {
    return NextResponse.json(
      { error: "Siswa bukan anggota grha Anda" },
      { status: 403 },
    );
  }

  const payment = await prisma.payment.create({
    data: {
      studentId,
      staffId: staff.id,
      amountRupiah,
      note: note || null,
      recordedByUserId: session.userId,
    },
  });

  await audit({
    action: "staff.payment.record",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { studentId, amountRupiah },
  });

  return NextResponse.json({ ok: true, id: payment.id });
}
