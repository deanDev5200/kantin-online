import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createCashierSession } from "@/lib/session";
import { CASHIER_PASSWORD_SETTING_KEY } from "@/lib/constants";
import { cashierLoginSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = cashierLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input tidak valid" }, { status: 400 });
  }

  const setting = await prisma.setting.findUnique({
    where: { key: CASHIER_PASSWORD_SETTING_KEY },
  });
  if (!setting) {
    return NextResponse.json(
      { error: "Password kasir belum diatur. Hubungi admin." },
      { status: 400 },
    );
  }

  if (!(await verifyPassword(parsed.data.password, setting.value))) {
    return NextResponse.json({ error: "Password kasir salah" }, { status: 401 });
  }

  await createCashierSession();
  await audit({ action: "cashier.login", actorLabel: "CASHIER" });
  return NextResponse.json({ ok: true });
}
