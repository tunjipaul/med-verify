/**
 * Synthetic Lagos mobilization fixtures for local / staging only.
 * Canonical call-up format: NYSC-LAG-{year}-{6-digit serial}
 */

const LAGOS_STATE = "Lagos";
const DEFAULT_YEAR = 2026;
const DEFAULT_COUNT = 1000;
const EMAIL_DOMAIN = "medverify.local";
const DEV_PASSWORD = "Password123!";

const FIRST_NAMES = [
  "Adaeze",
  "Chinedu",
  "Fatima",
  "Ibrahim",
  "Ngozi",
  "Oluwaseun",
  "Amina",
  "Emeka",
  "Zainab",
  "Tunde",
  "Blessing",
  "Yusuf",
  "Grace",
  "Kabir",
  "Funke",
];

const LAST_NAMES = [
  "Adebayo",
  "Okafor",
  "Bello",
  "Eze",
  "Lawal",
  "Okonkwo",
  "Suleiman",
  "Nwachukwu",
  "Yakubu",
  "Akinwale",
  "Mohammed",
  "Chukwu",
  "Abubakar",
  "Ogunleye",
  "Danjuma",
];

function parseCount(raw) {
  const value = Number(raw ?? DEFAULT_COUNT);
  if (!Number.isInteger(value) || value < 1 || value > 50_000) {
    throw new Error("LAGOS_CORPER_COUNT must be an integer between 1 and 50000");
  }
  return value;
}

function parseYear(raw) {
  const value = Number(raw ?? DEFAULT_YEAR);
  if (!Number.isInteger(value) || value < 2020 || value > 2100) {
    throw new Error("LAGOS_CORPER_YEAR must be a valid year");
  }
  return value;
}

/** @param {number} serial 1-based index */
function formatCallUpNumber(year, serial) {
  return `NYSC-LAG-${year}-${String(serial).padStart(6, "0")}`;
}

/** @param {number} serial 1-based index */
function formatEmail(serial) {
  return `corper.lag.${String(serial).padStart(6, "0")}@${EMAIL_DOMAIN}`;
}

/**
 * Fake but unique 11-digit NINs in a dedicated dev range (200xxxxxxxx).
 * @param {number} serial 1-based index
 */
function formatNin(serial) {
  const base = 200_000_000_00 + serial;
  return String(base).padStart(11, "0").slice(0, 11);
}

/**
 * Nigerian mobile: 0808 + 7 digits derived from serial (dev-only pattern).
 * @param {number} serial 1-based index
 */
function formatPhone(serial) {
  return `0808${String(serial).padStart(7, "0")}`.slice(0, 11);
}

/** @param {number} serial 1-based index */
function formatNames(serial) {
  const firstName = FIRST_NAMES[(serial - 1) % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor((serial - 1) / FIRST_NAMES.length) % LAST_NAMES.length];
  return { firstName, lastName };
}

/**
 * @param {object} options
 * @param {number} options.count
 * @param {number} options.year
 * @param {string} options.passwordHash
 */
function buildLagosCorperRecords({ count, year, passwordHash }) {
  const records = [];

  for (let serial = 1; serial <= count; serial += 1) {
    const { firstName, lastName } = formatNames(serial);
    records.push({
      email: formatEmail(serial),
      passwordHash,
      firstName,
      lastName,
      callUpNumber: formatCallUpNumber(year, serial),
      nin: formatNin(serial),
      phone: formatPhone(serial),
      postedState: LAGOS_STATE,
      currentState: LAGOS_STATE,
      isMobilized: true,
    });
  }

  return records;
}

module.exports = {
  LAGOS_STATE,
  DEFAULT_COUNT,
  DEFAULT_YEAR,
  DEV_PASSWORD,
  EMAIL_DOMAIN,
  parseCount,
  parseYear,
  formatCallUpNumber,
  formatEmail,
  formatNin,
  formatPhone,
  buildLagosCorperRecords,
};
