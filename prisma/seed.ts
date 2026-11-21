import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUsername = (process.env.SEED_ADMIN_USERNAME ?? "admin").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const adminFullName = process.env.SEED_ADMIN_FULLNAME ?? "Administrator";

  const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: adminUsername,
        fullName: adminFullName,
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash(adminPassword, 10),
      },
    });
    console.log(`[seed] Created admin '${adminUsername}'`);
  } else {
    console.log(`[seed] Admin '${adminUsername}' already exists, skipping.`);
  }

  const cashierPassword = process.env.CASHIER_INITIAL_PASSWORD ?? "kasir123";
  const cashierKey = "cashier_password_hash";
  const existingCashier = await prisma.setting.findUnique({ where: { key: cashierKey } });
  if (!existingCashier) {
    await prisma.setting.create({
      data: { key: cashierKey, value: await bcrypt.hash(cashierPassword, 10) },
    });
    console.log(`[seed] Initialized cashier password.`);
  } else {
    console.log(`[seed] Cashier password already set, skipping.`);
  }
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
