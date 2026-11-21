import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const PASSWORD_CHARSET = "abcdefghijklmnopqrstuvwxyz123456789";

export function generateRandomPassword(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * PASSWORD_CHARSET.length);
    out += PASSWORD_CHARSET[idx];
  }
  return out;
}
