import winston from "winston";

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isProd = process.env.NODE_ENV === "production";

export const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: "medverify-backend" },
  transports: [
    new winston.transports.Console({
      format: isProd ? combine(timestamp(), json()) : combine(colorize(), simple()),
    }),
  ],
});
