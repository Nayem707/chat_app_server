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

const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else
    cb(
      Object.assign(new Error("Only image files are allowed."), {
        status: 400,
      }),
    );
};

const messageFileFilter = (_req, file, cb) => {
  const ok =
    file.mimetype.startsWith("image/") ||
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
    ].includes(file.mimetype);
  if (ok) cb(null, true);
  else cb(Object.assign(new Error("Unsupported file type."), { status: 400 }));
};

export const uploadSingle = (field) =>
  multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single(field);

export const uploadMessageFile = multer({
  storage,
  fileFilter: messageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");
