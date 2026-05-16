import "dotenv/config";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { logger } from "./utils/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
});

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Shutting down server...`);

  server.close(async () => {
    await prisma.$disconnect();
    logger.info("HTTP server closed and Prisma disconnected.");
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
