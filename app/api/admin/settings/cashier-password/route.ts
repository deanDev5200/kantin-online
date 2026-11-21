import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { CASHIER_PASSWORD_SETTING_KEY } from "@/lib/constants";
import { updateCashierPasswordSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCashierPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 },
    );
  }

  const value = await hashPassword(parsed.data.newPassword);
  await prisma.setting.upsert({
    where: { key: CASHIER_PASSWORD_SETTING_KEY },
    create: { key: CASHIER_PASSWORD_SETTING_KEY, value },
    update: { value },
  });

  await audit({ action: "admin.setting.cashier_password" });

  return NextResponse.json({ ok: true });
}
