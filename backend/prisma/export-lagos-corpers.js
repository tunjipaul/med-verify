/**
 * Export full Lagos corper fixture list to JSON + CSV (dev/staging only).
 *
 * Usage:
 *   npm run export:lagos-corpers
 *   LAGOS_CORPER_COUNT=1000 npm run export:lagos-corpers
 */
const fs = require("fs");
const path = require("path");
const {
  buildLagosCorperRecords,
  parseCount,
  parseYear,
  DEV_PASSWORD,
  DEFAULT_YEAR,
  DEFAULT_COUNT,
} = require("./lib/lagos-coper-fixtures");

const OUT_DIR = path.join(__dirname, "data");
const JSON_PATH = path.join(OUT_DIR, "lagos-corpers-full.json");
const CSV_PATH = path.join(OUT_DIR, "lagos-corpers-full.csv");

function toSlashCallUp(hyphenForm) {
  const parts = hyphenForm.split("-");
  if (parts.length < 4) return hyphenForm;
  return parts.join("/");
}

function toExportRows(count, year) {
  const built = buildLagosCorperRecords({ count, year, passwordHash: "" });

  return built.map((record, index) => {
    const serial = index + 1;
    return {
      serial,
      callUpNumber: record.callUpNumber,
      callUpNumberSlash: toSlashCallUp(record.callUpNumber),
      nin: record.nin,
      phone: record.phone,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      postedState: record.postedState,
      currentState: record.currentState,
      isMobilized: record.isMobilized,
      devPassword: DEV_PASSWORD,
    };
  });
}

function escapeCsvCell(value) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  const headers = [
    "serial",
    "callUpNumber",
    "callUpNumberSlash",
    "nin",
    "phone",
    "email",
    "firstName",
    "lastName",
    "postedState",
    "currentState",
    "isMobilized",
    "devPassword",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escapeCsvCell(row[key])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const count = parseCount(process.env.LAGOS_CORPER_COUNT);
  const year = parseYear(process.env.LAGOS_CORPER_YEAR);
  const rows = toExportRows(count, year);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    state: "Lagos",
    year,
    count: rows.length,
    devPassword: DEV_PASSWORD,
    activationFields: ["callUpNumber", "nin", "phone"],
    notes: [
      "Dev/staging only. Do not commit to production systems.",
      "Matches prisma/lib/lagos-coper-fixtures.js and npm run prisma:seed:lagos.",
      "Use callUpNumber (hyphen) or callUpNumberSlash in the portal.",
    ],
    corpers: rows,
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2));
  fs.writeFileSync(CSV_PATH, toCsv(rows));

  console.log("Lagos corper export complete.");
  console.log(`  Records: ${rows.length}`);
  console.log(`  JSON: ${JSON_PATH}`);
  console.log(`  CSV:  ${CSV_PATH}`);
  console.log(`  Example: ${rows[0].callUpNumber} | NIN ${rows[0].nin} | ${rows[0].email}`);
}

main();
