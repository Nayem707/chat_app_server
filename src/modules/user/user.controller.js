import { asyncHandler } from "../../utils/asyncHandler.js";
import { userService } from "./user.service.js";

export const userController = {
  search: asyncHandler(async (req, res) => {
    const users = await userService.search(req.user.id, req.query.q || "");
    res.json({ success: true, data: users });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await userService.getCurrentProfile(req.user);
    res.json({ success: true, data: user });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateCurrentProfile(
      req.user.id,
      req.body || {},
    );
    res.json({ success: true, data: user });
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) {
      const err = new Error("No file uploaded.");
      err.status = 400;
      throw err;
    }
    const user = await userService.updateCurrentProfile(req.user.id, {
      avatarUrl: `/uploads/${req.file.filename}`,
    });
    res.json({ success: true, data: user });
  }),

  uploadCover: asyncHandler(async (req, res) => {
    if (!req.file) {
      const err = new Error("No file uploaded.");
      err.status = 400;
      throw err;
    }
    const user = await userService.updateCurrentProfile(req.user.id, {
      coverUrl: `/uploads/${req.file.filename}`,
    });
    res.json({ success: true, data: user });
  }),
};
