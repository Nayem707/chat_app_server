/**
 * Seed script: wipes all collections and inserts dummy users.
 * Run with: node scripts/seed.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import argon2 from "argon2";
import { env } from "../src/config/env.js";

// ── Models ──────────────────────────────────────────────────────────────────
import { UserModel } from "../src/modules/user/user.model.js";
import { ConversationModel } from "../src/modules/conversation/conversation.model.js";
import { MessageModel } from "../src/modules/message/message.model.js";
import { FriendshipModel } from "../src/modules/friends/friendship.model.js";

// ── Dummy users ──────────────────────────────────────────────────────────────
const USERS = [
  { displayName: "Alice Johnson", email: "alice@demo.com" },
  { displayName: "Bob Smith",     email: "bob@demo.com" },
  { displayName: "Carol White",   email: "carol@demo.com" },
  { displayName: "David Lee",     email: "david@demo.com" },
  { displayName: "Eva Martinez",  email: "eva@demo.com" },
];

const DEFAULT_PASSWORD = "Demo1234!";

async function seed() {
  await mongoose.connect(env.DATABASE_URL, { autoIndex: true });
  console.log("✔  Connected to MongoDB");

  // Wipe everything
  await Promise.all([
    UserModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    MessageModel.deleteMany({}),
    FriendshipModel.deleteMany({}),
  ]);
  console.log("✔  All collections cleared");

  const passwordHash = await argon2.hash(DEFAULT_PASSWORD);

  const users = await UserModel.insertMany(
    USERS.map((u) => ({
      displayName: u.displayName,
      email: u.email,
      username: u.displayName.toLowerCase().replace(/\s+/g, "."),
      passwordHash,
      isOnline: false,
    })),
  );

  console.log("\n✔  Dummy users created (password: Demo1234!):\n");
  users.forEach((u) =>
    console.log(`   ${u.displayName.padEnd(16)}  ${u.email}`),
  );

  await mongoose.disconnect();
  console.log("\n✔  Done. Database is ready.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
