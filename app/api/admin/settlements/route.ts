import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { settlementSchema, adjustSettlementSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settlementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const { grha, periodYear, periodMonth, note } = parsed.data;
  const start = new Date(periodYear, periodMonth - 1, 1);
  const end = new Date(periodYear, periodMonth, 1);

  // A month can only be settled after it has ended. Settling a running month
  // would snapshot an incomplete total and later transactions would not be
  // reflected in the bill. The bill for month M is paid on/after the 1st of M+1.
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (start >= currentMonthStart) {
    return NextResponse.json(
      { error: "Tagihan hanya dapat ditandai lunas setelah bulannya berakhir." },
      { status: 400 },
    );
  }

  // Recompute total from DB to avoid trusting client-provided amount.
  const txs = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      student: { grha },
      createdAt: { gte: start, lt: end },
    },
    select: { totalRupiah: true },
  });
  const totalSpentRupiah = txs.reduce((a, t) => a + t.totalRupiah, 0);

  const existing = await prisma.monthlySettlement.findUnique({
    where: {
      grha_periodYear_periodMonth: { grha, periodYear, periodMonth },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Tagihan bulan ini sudah ditandai lunas" }, { status: 409 });
  }

  const settlement = await prisma.monthlySettlement.create({
    data: {
      grha,
      periodYear,
      periodMonth,
      totalSpentRupiah,
      paidByUserId: session.userId,
      note: note || null,
    },
  });

  await audit({
    action: "admin.settlement.create",
    entityType: "MonthlySettlement",
    entityId: settlement.id,
    metadata: { grha, periodYear, periodMonth, totalSpentRupiah },
  });

  return NextResponse.json({ ok: true, totalSpentRupiah });
}

// Adjust an existing settlement to the current recomputed total.
// Used when transactions were added after a month was marked paid, so the
// recorded snapshot no longer matches the live bill ("Perlu ditinjau").
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adjustSettlementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const { grha, periodYear, periodMonth, note } = parsed.data;
  const start = new Date(periodYear, periodMonth - 1, 1);
  const end = new Date(periodYear, periodMonth, 1);

  const existing = await prisma.monthlySettlement.findUnique({
    where: {
      grha_periodYear_periodMonth: { grha, periodYear, periodMonth },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Tagihan bulan ini belum ditandai lunas" },
      { status: 404 },
    );
  }

  const txs = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      student: { grha },
      createdAt: { gte: start, lt: end },
    },
    select: { totalRupiah: true },
  });
  const totalSpentRupiah = txs.reduce((a, t) => a + t.totalRupiah, 0);

  const updated = await prisma.monthlySettlement.update({
    where: { id: existing.id },
    data: {
      totalSpentRupiah,
      paidAt: new Date(),
      paidByUserId: session.userId,
      note: note || existing.note,
    },
  });

  await audit({
    action: "admin.settlement.adjust",
    entityType: "MonthlySettlement",
    entityId: updated.id,
    metadata: {
      grha,
      periodYear,
      periodMonth,
      previousRupiah: existing.totalSpentRupiah,
      totalSpentRupiah: updated.totalSpentRupiah,
    },
  });

  return NextResponse.json({
    ok: true,
    totalSpentRupiah: updated.totalSpentRupiah,
    previousRupiah: existing.totalSpentRupiah,
  });
}
