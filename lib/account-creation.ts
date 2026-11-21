import { Prisma, Role, type Grha } from "@prisma/client";
import { prisma } from "./db";
import { hashPassword, generateRandomPassword } from "./password";
import { generateUniqueUsername } from "./username";
import { GENERATED_PASSWORD_LENGTH } from "./constants";

export type CreateAccountInput = {
  fullName: string;
  role: Role;
  grha?: Grha;
};

export type CreateAccountResult = {
  userId: string;
  username: string;
  plainPassword: string;
  role: Role;
};

export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error("Nama lengkap wajib diisi");

  const username = await generateUniqueUsername(fullName, async (candidate) => {
    const found = await prisma.user.findUnique({ where: { username: candidate } });
    return Boolean(found);
  });

  const plainPassword = generateRandomPassword(GENERATED_PASSWORD_LENGTH);
  const passwordHash = await hashPassword(plainPassword);

  if (input.role === Role.STUDENT) {
    if (!input.grha) throw new Error("Grha wajib diisi untuk siswa");
    const created = await prisma.user.create({
      data: {
        username,
        fullName,
        role: Role.STUDENT,
        passwordHash,
        student: { create: { grha: input.grha } },
      },
    });
    return { userId: created.id, username, plainPassword, role: Role.STUDENT };
  }

  if (input.role === Role.STAFF) {
    if (!input.grha) throw new Error("Grha wajib diisi untuk Matta/Pitta");
    const staffCount = await prisma.staff.count({ where: { grha: input.grha } });
    if (staffCount >= 2) {
      throw new Error(`Grha ${input.grha} sudah memiliki 2 Matta/Pitta`);
    }
    const created = await prisma.user.create({
      data: {
        username,
        fullName,
        role: Role.STAFF,
        passwordHash,
        staff: { create: { grha: input.grha } },
      },
    });
    return { userId: created.id, username, plainPassword, role: Role.STAFF };
  }

  const created = await prisma.user.create({
    data: {
      username,
      fullName,
      role: Role.ADMIN,
      passwordHash,
    },
  });
  return { userId: created.id, username, plainPassword, role: Role.ADMIN };
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
