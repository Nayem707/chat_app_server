import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { appStore } from "../store.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const currentUser = req.user;

    const { q = "" } = req.query;
    const users = await appStore.getUsersForSearch(currentUser.id, q);
    res.json({ success: true, data: users });
  }),
);

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: appStore.sanitizeUser(req.user) });
  }),
);

usersRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const currentUser = req.user;

    const { name, bio } = req.body || {};
    const updated = await appStore.updateUser(currentUser.id, {
      name: name?.trim() || currentUser.name,
      bio: typeof bio === "string" ? bio : currentUser.bio,
    });

    res.json({ success: true, data: appStore.sanitizeUser(updated) });
  }),
);
