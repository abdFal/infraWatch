/**
 * Database seed script.
 *
 * Run with:  npx prisma db seed
 *
 * Creates (idempotently):
 *   - the initial ADMIN user, from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 *   - the application settings row (AWS region from AWS_REGION)
 *   - monitoring preferences for the admin user
 *
 * Re-running is safe: an existing admin keeps their current password.
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
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Administrator";
  const region = process.env.AWS_REGION?.trim() || "us-east-1";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env before seeding.",
    );
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters long.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const admin =
    existing ??
    (await prisma.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      },
    }));

  await prisma.monitoringPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, refreshIntervalSec: 60, defaultTimeRange: "H3" },
  });

  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, awsRegion: region },
  });

  await prisma.activityLog.create({
    data: {
      action: "SYSTEM",
      description: existing
        ? "Seed script re-run (existing admin kept)"
        : "Database seeded with initial admin user",
      metadata: { email },
    },
  });

  console.log(
    existing
      ? `Admin user ${email} already exists. Password unchanged.`
      : `Created admin user ${email}.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
