"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = require("./lib/prisma");
const logger_1 = require("./utils/logger");
const server = app_1.default.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`Server running on http://localhost:${env_1.env.PORT}`);
});
async function gracefulShutdown(signal) {
    logger_1.logger.info(`${signal} received. Shutting down server...`);
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        logger_1.logger.info("HTTP server closed and Prisma disconnected.");
        process.exit(0);
    });
}
process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM");
});
//# sourceMappingURL=server.js.map