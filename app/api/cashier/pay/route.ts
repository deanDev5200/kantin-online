import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCashierSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { MAX_PIN_ATTEMPTS } from "@/lib/constants";
import { cashierPaySchema } from "@/lib/validation";
import { getMonthlyLimitRupiah } from "@/lib/settings";

export async function POST(request: Request) {
  if (!(await getCashierSession())) {
    return NextResponse.json({ error: "Sesi kasir tidak valid" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = cashierPaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const { cardUid, pin, items } = parsed.data;

  const student = await prisma.student.findUnique({
    where: { cardUid },
    include: { user: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Kartu tidak terdaftar" }, { status: 404 });
  }
  if (!student.cardPinHash) {
    return NextResponse.json(
      { error: "Siswa belum membuat PIN kartu. Minta siswa membuat PIN di website." },
      { status: 400 },
    );
  }
  if (student.cardStatus === "BLOCKED") {
    return NextResponse.json(
      {
        error:
          student.cardBlockReason === "PIN_ATTEMPTS"
            ? "Kartu diblokir karena salah PIN terlalu sering. Buka blokir lewat website siswa atau admin."
            : "Kartu diblokir. Buka blokir lewat website siswa atau admin.",
      },
      { status: 403 },
    );
  }

  const pinOk = await verifyPassword(pin, student.cardPinHash);
  if (!pinOk) {
    const nextAttempts = student.pinAttempts + 1;
    if (nextAttempts >= MAX_PIN_ATTEMPTS) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          pinAttempts: nextAttempts,
          cardStatus: "BLOCKED",
          cardBlockReason: "PIN_ATTEMPTS",
        },
      });
      return NextResponse.json(
        { error: `PIN salah ${MAX_PIN_ATTEMPTS}x. Kartu diblokir.` },
        { status: 403 },
      );
    }
    await prisma.student.update({
      where: { id: student.id },
      data: { pinAttempts: nextAttempts },
    });
    return NextResponse.json(
      { error: `PIN salah. Sisa percobaan: ${MAX_PIN_ATTEMPTS - nextAttempts}` },
      { status: 401 },
    );
  }

  // Compute totals server-side.
  const normalizedItems = items.map((it) => ({
    name: it.name.trim(),
    unitPriceRupiah: it.unitPriceRupiah,
    quantity: it.quantity,
    subtotalRupiah: it.unitPriceRupiah * it.quantity,
  }));
  const totalRupiah = normalizedItems.reduce((a, it) => a + it.subtotalRupiah, 0);

  if (totalRupiah <= 0) {
    return NextResponse.json({ error: "Total pembayaran tidak valid" }, { status: 400 });
  }

  // Enforce available balance: cannot spend more than has been collected.
  const [paidAgg, spentAllAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: { studentId: student.id },
      _sum: { amountRupiah: true },
    }),
    prisma.transaction.aggregate({
      where: { studentId: student.id, status: "COMPLETED" },
      _sum: { totalRupiah: true },
    }),
  ]);
  const totalPaid = paidAgg._sum.amountRupiah ?? 0;
  const totalSpentAll = spentAllAgg._sum.totalRupiah ?? 0;
  const balance = totalPaid - totalSpentAll;
  if (totalRupiah > balance) {
    return NextResponse.json(
      {
        error: `Saldo tidak cukup. Saldo tersedia: Rp ${balance.toLocaleString(
          "id-ID",
        )}, total belanja: Rp ${totalRupiah.toLocaleString("id-ID")}.`,
      },
      { status: 400 },
    );
  }

  // Enforce the global monthly limit (if configured).
  const monthlyLimitRupiah = await getMonthlyLimitRupiah();
  if (monthlyLimitRupiah != null) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const spentAgg = await prisma.transaction.aggregate({
      where: {
        studentId: student.id,
        status: "COMPLETED",
        createdAt: { gte: monthStart },
      },
      _sum: { totalRupiah: true },
    });
    const spent = spentAgg._sum.totalRupiah ?? 0;
    if (spent + totalRupiah > monthlyLimitRupiah) {
      return NextResponse.json(
        {
          error: `Melebihi limit bulanan. Sisa limit: Rp ${(
            monthlyLimitRupiah - spent
          ).toLocaleString("id-ID")}`,
        },
        { status: 400 },
      );
    }
  }

  const tx = await prisma.transaction.create({
    data: {
      studentId: student.id,
      totalRupiah,
      status: "COMPLETED",
      items: { create: normalizedItems },
    },
  });

  // Successful payment resets PIN attempt counter.
  await prisma.student.update({
    where: { id: student.id },
    data: { pinAttempts: 0 },
  });

  return NextResponse.json({
    ok: true,
    transactionId: tx.id,
    totalRupiah,
    studentName: student.user.fullName,
  });
}
