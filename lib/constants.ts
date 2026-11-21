import type { Grha } from "@prisma/client";

export const GRHA_LIST = [
  "AIRSANYA",
  "DAKSINA",
  "GENYA",
  "MADHYA",
  "NAIRITI",
  "PASCIMA",
  "PURWA",
  "UTTARA",
  "WAYABHYA",
] as const satisfies readonly Grha[];

export const GRHA_LABELS: Record<Grha, string> = {
  AIRSANYA: "Airsanya",
  DAKSINA: "Daksina",
  GENYA: "Genya",
  MADHYA: "Madhya",
  NAIRITI: "Nairiti",
  PASCIMA: "Pascima",
  PURWA: "Purwa",
  UTTARA: "Uttara",
  WAYABHYA: "Wayabhya",
};

export const MAX_PIN_ATTEMPTS = 5;

export const USERNAME_MAX_LENGTH = 20;
export const PIN_LENGTH = 6;
export const GENERATED_PASSWORD_LENGTH = 6;

export const SESSION_COOKIE_NAME = "kc_session";
export const CASHIER_COOKIE_NAME = "kc_cashier";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const CASHIER_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export const CASHIER_PASSWORD_SETTING_KEY = "cashier_password_hash";
