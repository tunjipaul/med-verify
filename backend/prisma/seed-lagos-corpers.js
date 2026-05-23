/**
 * Bulk seed mobilized corpers for Lagos pilot (dev/staging only).
 *
 * Usage:
 *   npm run prisma:seed:lagos
 *   LAGOS_CORPER_COUNT=1000 npm run prisma:seed:lagos
 *   LAGOS_CORPER_PURGE=true npm run prisma:seed:lagos
 *
 * Requires DATABASE_URL in .env and staff seed (hospitals/doctors) is optional.
 */
require("dotenv/config");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { PrismaClient, Role, MctStatus, EventType } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const {
  buildLagosCorperRecords,
  parseCount,
  parseYear,
  DEV_PASSWORD,
  EMAIL_DOMAIN,
  formatCallUpNumber,
} = require("./lib/lagos-coper-fixtures");

const BATCH_SIZE = 50;
const CALL_UP_PREFIX = "NYSC-LAG-";
const EMAIL_PREFIX = "corper.lag.";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required in .env");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function purgeLagosCorpers() {
  const lagosCorpers = await prisma.corper.findMany({
    where: { callUpNumber: { startsWith: CALL_UP_PREFIX } },
    select: { id: true, userId: true },
  });

  if (lagosCorpers.length === 0) {
    console.log("No existing Lagos bulk corpers to purge.");
    return;
  }

  const corperIds = lagosCorpers.map((row) => row.id);
  const userIds = lagosCorpers.map((row) => row.userId);

  const mctCases = await prisma.mctCase.findMany({
    where: { corperId: { in: corperIds } },
    select: { id: true },
  });
  const mctCaseIds = mctCases.map((row) => row.id);

  if (mctCaseIds.length > 0) {
    await prisma.caseDecision.deleteMany({ where: { mctCaseId: { in: mctCaseIds } } });
    await prisma.verificationCode.deleteMany({ where: { mctCaseId: { in: mctCaseIds } } });
    await prisma.auditLog.deleteMany({ where: { mctCaseId: { in: mctCaseIds } } });
    await prisma.mctCase.deleteMany({ where: { id: { in: mctCaseIds } } });
  }

  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.corper.deleteMany({ where: { id: { in: corperIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(`Purged ${lagosCorpers.length} Lagos bulk corper(s) and related rows.`);
}

/** One CREATED MCT per mobilized corper — same as NYSC SYSTEM mobilization provisioning. */
async function ensureSystemMctForCorper(corperId) {
  const active = await prisma.mctCase.findFirst({
    where: {
      corperId,
      deletedAt: null,
      status: { notIn: [MctStatus.APPROVED, MctStatus.REJECTED, MctStatus.CLOSED] },
    },
    select: { id: true },
  });
  if (active) {
    return active.id;
  }

  const created = await prisma.mctCase.create({
    data: {
      corperId,
      status: MctStatus.CREATED,
    },
  });

  await prisma.auditLog.create({
    data: {
      eventType: EventType.MCT_CREATED,
      actorRole: Role.SYSTEM,
      mctCaseId: created.id,
      payloadSummary: { source: "lagos_mobilization_seed" },
    },
  });

  return created.id;
}

async function upsertCorperRecord(record) {
  const user = await prisma.user.upsert({
    where: { email: record.email },
    update: {
      passwordHash: record.passwordHash,
      role: Role.CORPER,
      firstName: record.firstName,
      lastName: record.lastName,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email: record.email,
      passwordHash: record.passwordHash,
      role: Role.CORPER,
      firstName: record.firstName,
      lastName: record.lastName,
      isActive: true,
    },
  });

  const corper = await prisma.corper.upsert({
    where: { callUpNumber: record.callUpNumber },
    update: {
      userId: user.id,
      nin: record.nin,
      phone: record.phone,
      postedState: record.postedState,
      currentState: record.currentState,
      isMobilized: record.isMobilized,
      deletedAt: null,
    },
    create: {
      userId: user.id,
      callUpNumber: record.callUpNumber,
      nin: record.nin,
      phone: record.phone,
      postedState: record.postedState,
      currentState: record.currentState,
      isMobilized: record.isMobilized,
    },
  });

  if (record.isMobilized) {
    await ensureSystemMctForCorper(corper.id);
  }
}

async function seedBatch(records) {
  for (const record of records) {
    await upsertCorperRecord(record);
  }
}

function toSample(record) {
  return {
    callUpNumber: record.callUpNumber,
    nin: record.nin,
    phone: record.phone,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
  };
}

function writeManifest({ count, year, durationMs, records }) {
  const outDir = path.join(__dirname, "data");
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    state: "Lagos",
    count,
    year,
    callUpPrefix: CALL_UP_PREFIX,
    durationMs,
    devPassword: DEV_PASSWORD,
    activationFields: ["callUpNumber", "nin", "phone"],
    samples: [records[0], records[1], records[records.length - 1]].filter(Boolean).map(toSample),
    notes: [
      "Dev/staging only. Do not run in production.",
      "Corpers are pre-provisioned; portal activation should lookup by callUpNumber.",
      "Each mobilized corper gets one SYSTEM MCT (status CREATED) — mirrors NYSC mobilization.",
      "UI may show NYSC/LAG/2026/000001 — normalize to NYSC-LAG-2026-000001 on the API.",
    ],
  };

  const filePath = path.join(outDir, "lagos-corpers-manifest.json");
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${filePath}`);
}

async function main() {
  const count = parseCount(process.env.LAGOS_CORPER_COUNT);
  const year = parseYear(process.env.LAGOS_CORPER_YEAR);
  const shouldPurge = process.env.LAGOS_CORPER_PURGE === "true";

  console.log(`Lagos corper bulk seed: ${count} mobilized record(s), year ${year}`);

  if (shouldPurge) {
    await purgeLagosCorpers();
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const records = buildLagosCorperRecords({ count, year, passwordHash });

  const started = Date.now();
  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
    const batch = records.slice(offset, offset + BATCH_SIZE);
    await seedBatch(batch);
    const done = Math.min(offset + BATCH_SIZE, records.length);
    console.log(`  ${done}/${records.length}`);
  }
  const durationMs = Date.now() - started;

  const total = await prisma.corper.count({
    where: { callUpNumber: { startsWith: CALL_UP_PREFIX }, isMobilized: true },
  });

  writeManifest({ count, year, durationMs, records });

  const first = records[0];
  console.log("Lagos bulk seed complete.");
  console.log(`  Mobilized Lagos corpers in DB (NYSC-LAG-*): ${total}`);
  console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log("  Test login (email/password, until activation API exists):");
  console.log(`    Email:    ${first.email}`);
  console.log(`    Password: ${DEV_PASSWORD}`);
  console.log("  Activation test (when API is built):");
  console.log(`    Call-up:  ${first.callUpNumber}`);
  console.log(`    NIN:      ${first.nin}`);
  console.log(`    Phone:    ${first.phone}`);
  console.log("  More samples: prisma/data/lagos-corpers-manifest.json");
}

main()
  .catch((err) => {
    console.error("Lagos corper seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
