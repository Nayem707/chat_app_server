import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import morgan from "morgan";

import mongoose from "mongoose";
import { env, isDev } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase } from "./config/database.js";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";

export const createApp = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDatabase();
  }

  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1); // required for correct client IP behind reverse proxies

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));

  if (isDev) {
    app.use(
      morgan(":method :url :status :response-time ms - :res[content-length]"),
    );
  } else {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === "/api/health/live",
        },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
      }),
    );
  }

  app.use(globalLimiter);

  app.use("/api", apiRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
