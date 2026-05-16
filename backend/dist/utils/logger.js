"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, errors, json, colorize, simple } = winston_1.default.format;
const isProd = process.env.NODE_ENV === "production";
exports.logger = winston_1.default.createLogger({
    level: isProd ? "info" : "debug",
    format: combine(timestamp(), errors({ stack: true }), json()),
    defaultMeta: { service: "medverify-backend" },
    transports: [
        new winston_1.default.transports.Console({
            format: isProd ? combine(timestamp(), json()) : combine(colorize(), simple()),
        }),
    ],
});
//# sourceMappingURL=logger.js.map