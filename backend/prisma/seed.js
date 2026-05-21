require("dotenv/config");
const bcrypt = require("bcrypt");
const { PrismaClient, Role, HospitalTier } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required in .env");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function upsertUser(email, passwordHash, role, firstName, lastName) {
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, firstName, lastName, isActive: true },
    create: { email, passwordHash, role, firstName, lastName, isActive: true },
  });
}

async function main() {
  const defaultPassword = "Password123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const abujaAdmin = await upsertUser(
    "admin@medverify.local",
    passwordHash,
    Role.ABUJA_ADMIN,
    "Abuja",
    "Admin",
  );

  const dg = await upsertUser("dg@medverify.local", passwordHash, Role.DG, "Director", "General");
  const coordinator = await upsertUser(
    "coordinator@medverify.local",
    passwordHash,
    Role.COORDINATOR,
    "State",
    "Coordinator",
  );

  const corperUser = await upsertUser(
    "corper@medverify.local",
    passwordHash,
    Role.CORPER,
    "Sample",
    "Corper",
  );

  const doctorUser = await upsertUser(
    "doctor@medverify.local",
    passwordHash,
    Role.DOCTOR,
    "Sample",
    "Doctor",
  );

  const hospital = await prisma.hospital.upsert({
    where: { approvedRegistryId: "NYSC-HOSP-0001" },
    update: { name: "Federal Medical Centre Abuja", state: "FCT", tier: HospitalTier.TIER_1 },
    create: {
      name: "Federal Medical Centre Abuja",
      state: "FCT",
      tier: HospitalTier.TIER_1,
      approvedRegistryId: "NYSC-HOSP-0001",
    },
  });

  await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {
      hospitalId: hospital.id,
      mdcnNumber: "MDCN-000001",
      specialization: "Internal Medicine",
      isActive: true,
    },
    create: {
      userId: doctorUser.id,
      hospitalId: hospital.id,
      mdcnNumber: "MDCN-000001",
      specialization: "Internal Medicine",
      isActive: true,
    },
  });

  await prisma.corper.upsert({
    where: { userId: corperUser.id },
    update: {
      callUpNumber: "NYSC-2026-00001",
      nin: "10000000001",
      postedState: "Kano",
      currentState: "Kano",
      isMobilized: true,
      phone: "08030000001",
    },
    create: {
      userId: corperUser.id,
      callUpNumber: "NYSC-2026-00001",
      nin: "10000000001",
      postedState: "Kano",
      currentState: "Kano",
      isMobilized: true,
      phone: "08030000001",
    },
  });

  console.log("Seed complete.");
  console.log("Default login password for all seeded users:", defaultPassword);
  console.log("Seeded emails:");
  console.log("- admin@medverify.local (ABUJA_ADMIN)");
  console.log("- dg@medverify.local (DG)");
  console.log("- coordinator@medverify.local (COORDINATOR)");
  console.log("- doctor@medverify.local (DOCTOR)");
  console.log("- corper@medverify.local (CORPER)");
  console.log("Reference IDs:");
  console.log("- ABUJA_ADMIN user ID:", abujaAdmin.id);
  console.log("- DG user ID:", dg.id);
  console.log("- COORDINATOR user ID:", coordinator.id);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
