import { z } from "zod";
import { GRHA_LIST } from "./constants";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const changeCredentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(20, "Username maksimal 20 karakter")
    .regex(/^[a-z0-9]+$/, "Username hanya huruf kecil dan angka"),
  currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
  newPassword: z
    .string()
    .min(6, "Password baru minimal 6 karakter")
    .optional()
    .or(z.literal("")),
});

export const setCardPinSchema = z.object({
  pin: z
    .string()
    .regex(/^[0-9]{6}$/, "PIN kartu harus 6 digit angka"),
  confirmPin: z.string(),
}).refine((v) => v.pin === v.confirmPin, {
  message: "Konfirmasi PIN tidak cocok",
  path: ["confirmPin"],
});

export const grhaEnum = z.enum(GRHA_LIST);

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  role: z.enum(["STUDENT", "STAFF", "ADMIN"]),
  grha: grhaEnum.optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  grha: grhaEnum.optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(1).optional(),
});

export const cashierLoginSchema = z.object({
  password: z.string().min(1, "Password kasir wajib diisi"),
});

export const cashierPaySchema = z.object({
  cardUid: z.string().trim().min(1, "Kartu harus di-tap"),
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit angka"),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        unitPriceRupiah: z.number().int().min(0),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Minimal 1 item"),
});

export const recordPaymentSchema = z.object({
  studentId: z.string().min(1),
  amountRupiah: z.number().int().min(1, "Nominal harus lebih dari 0"),
  note: z.string().trim().optional(),
});

export const settlementSchema = z.object({
  grha: grhaEnum,
  periodYear: z.number().int().min(2000).max(3000),
  periodMonth: z.number().int().min(1).max(12),
  note: z.string().trim().optional(),
});

export const adjustSettlementSchema = z.object({
  grha: grhaEnum,
  periodYear: z.number().int().min(2000).max(3000),
  periodMonth: z.number().int().min(1).max(12),
  note: z.string().trim().optional(),
});

export const updateCashierPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password kasir minimal 6 karakter"),
});

export const assignStudentCardSchema = z.object({
  cardUid: z.string().trim().min(1, "UID kartu wajib diisi"),
});

