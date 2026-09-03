import mongoose from "mongoose";
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/httpResponse.js";

export const healthRouter = Router();

healthRouter.get(
  "/live",
  asyncHandler(async (_req, res) => ok(res, { status: "live" })),
);

healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      const error = new Error("Database not ready.");
      error.status = 503;
      throw error;
    }
    ok(res, { status: "ready", db: "ok" });
  }),
);
