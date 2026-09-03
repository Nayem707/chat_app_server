// Load .env before any config module reads process.env. No-op when file is absent.
import "dotenv/config";

import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { createSocketServer } from "./sockets/socket.server.js";

const start = async () => {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Socket.IO shares the same HTTP server so cookies/origin behave consistently.
  const io = createSocketServer(httpServer);
  app.set("io", io);

  const server = httpServer.listen(env.PORT, () => {
    console.log(`Server running in "${env.NODE_ENV}" mode`);
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => logger.info("HTTP server closed"));
    io.close(() => logger.info("Socket.IO closed"));
    await disconnectDatabase();
    process.exit(0);
  };

  ["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception — exiting");
    process.exit(1);
  });
};

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
