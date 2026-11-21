import { prisma } from "./db";
import { MONTHLY_LIMIT_SETTING_KEY } from "./constants";

/**
 * Read the global monthly spending limit (integer Rupiah).
 * Returns null when unset or invalid (meaning "no limit").
 */
export async function getMonthlyLimitRupiah(): Promise<number | null> {
  const setting = await prisma.setting.findUnique({
    where: { key: MONTHLY_LIMIT_SETTING_KEY },
  });
  if (!setting) return null;
  const value = Number(setting.value);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}
