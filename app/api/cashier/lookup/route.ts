import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCashierSession } from "@/lib/session";
import { GRHA_LABELS } from "@/lib/constants";
import { getMonthlyLimitRupiah } from "@/lib/settings";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  if (!(await getCashierSession())) {
    return NextResponse.json({ error: "Sesi kasir tidak valid" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const cardUid = typeof body?.cardUid === "string" ? body.cardUid.trim() : "";
  if (!cardUid) {
    return NextResponse.json({ error: "Kartu harus di-tap" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { cardUid },
    include: { user: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Kartu tidak terdaftar" }, { status: 404 });
  }

  // Compute this month's spending (for limit) and overall balance.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [spentAgg, paidAgg, spentAllAgg, monthlyLimitRupiah] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        studentId: student.id,
        status: "COMPLETED",
        createdAt: { gte: monthStart },
      },
      _sum: { totalRupiah: true },
    }),
    prisma.payment.aggregate({
      where: { studentId: student.id },
      _sum: { amountRupiah: true },
    }),
    prisma.transaction.aggregate({
      where: { studentId: student.id, status: "COMPLETED" },
      _sum: { totalRupiah: true },
    }),
    getMonthlyLimitRupiah(),
  ]);
  const balanceRupiah =
    (paidAgg._sum.amountRupiah ?? 0) - (spentAllAgg._sum.totalRupiah ?? 0);

  await audit({
    action: "cashier.lookup",
    entityType: "Student",
    entityId: student.id,
    actorLabel: "CASHIER",
    metadata: { cardLast4: cardUid.slice(-4) },
  });

  return NextResponse.json({
    studentId: student.id,
    fullName: student.user.fullName,
    grha: GRHA_LABELS[student.grha],
    cardStatus: student.cardStatus,
    hasPin: Boolean(student.cardPinHash),
    monthlyLimitRupiah,
    monthSpentRupiah: spentAgg._sum.totalRupiah ?? 0,
    balanceRupiah,
  });
}
