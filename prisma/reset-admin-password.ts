/**
 * Resets the password of the user SEED_ADMIN_EMAIL to SEED_ADMIN_PASSWORD.
 *
 * Run with:  npm run db:reset-admin-password
 *
 * Use it if you forget the admin password: edit SEED_ADMIN_PASSWORD in .env,
 * then run the command above.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env first.");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters long.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}. Run "npm run db:seed" to create it.`);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await prisma.activityLog.create({
    data: { action: "SYSTEM", description: `Password reset from the command line for ${email}`, userId: user.id },
  });
  console.log(`Password updated for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
