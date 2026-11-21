import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MONTHLY_LIMIT_SETTING_KEY } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const raw = body?.monthlyLimitRupiah;

  // null / empty string => remove the limit.
  if (raw === null || raw === "" || raw === undefined) {
    await prisma.setting.deleteMany({ where: { key: MONTHLY_LIMIT_SETTING_KEY } });
    return NextResponse.json({ ok: true, monthlyLimitRupiah: null });
  }

  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    return NextResponse.json({ error: "Limit bulanan tidak valid" }, { status: 400 });
  }

  if (raw === 0) {
    await prisma.setting.deleteMany({ where: { key: MONTHLY_LIMIT_SETTING_KEY } });
    return NextResponse.json({ ok: true, monthlyLimitRupiah: null });
  }

  await prisma.setting.upsert({
    where: { key: MONTHLY_LIMIT_SETTING_KEY },
    create: { key: MONTHLY_LIMIT_SETTING_KEY, value: String(raw) },
    update: { value: String(raw) },
  });

  return NextResponse.json({ ok: true, monthlyLimitRupiah: raw });
}
