import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { env } from "../config/env.js";

const uploadsDir = env.STORAGE_LOCAL_DIR;
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else
    cb(
      Object.assign(new Error("Only image files are allowed."), {
        status: 400,
      }),
    );
};

export const uploadSingle = (field) =>
  multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single(
    field,
  );
