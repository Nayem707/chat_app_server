import { Router } from "express";
import { friendshipController } from "./friendship.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

export const friendshipRoutes = Router();
friendshipRoutes.use(authenticate);

// Specific routes first to avoid /:requestId swallowing them.
friendshipRoutes.get("/", friendshipController.getFriends);
friendshipRoutes.post("/request", friendshipController.sendRequest);
friendshipRoutes.get(
  "/requests/incoming",
  friendshipController.getIncomingRequests,
);
friendshipRoutes.get("/requests/sent", friendshipController.getSentRequests);
friendshipRoutes.get("/status/:userId", friendshipController.getStatus);
friendshipRoutes.patch("/:requestId/accept", friendshipController.accept);
friendshipRoutes.patch("/:requestId/reject", friendshipController.reject);
friendshipRoutes.delete("/:requestId", friendshipController.cancel);
