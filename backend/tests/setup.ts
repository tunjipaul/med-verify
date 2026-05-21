import "dotenv/config";

// Enable plaintext verification-code echo only during automated tests.
process.env.ALLOW_TEST_CODE_PLAINTEXT = "true";
process.env.ALLOW_DEV_OTP_PLAINTEXT = "true";
