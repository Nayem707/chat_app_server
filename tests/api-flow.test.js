import test, { after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import request from "supertest";

import { createApp } from "../src/app.js";

after(async () => {
  await mongoose.disconnect();
});

test("register -> login -> user search -> create conversation -> messages -> group -> logout flow", async (t) => {
  const app = await createApp();

  const unique = Date.now();
  const userA = {
    name: "Alice Demo",
    email: `alice.${unique}@example.com`,
    password: "Password123!",
  };

  const userB = {
    name: "Bob Demo",
    email: `bob.${unique}@example.com`,
    password: "Password123!",
  };

  const registerA = await request(app).post("/api/auth/register").send(userA);
  assert.equal(registerA.status, 201);
  assert.equal(registerA.body.success, true);

  const registerB = await request(app).post("/api/auth/register").send(userB);
  assert.equal(registerB.status, 201);
  assert.equal(registerB.body.success, true);

  const loginA = await request(app).post("/api/auth/login").send({
    email: userA.email,
    password: userA.password,
  });

  assert.equal(loginA.status, 200);
  assert.equal(loginA.body.success, true);
  assert.ok(loginA.headers["set-cookie"]?.length);

  const cookie = loginA.headers["set-cookie"][0].split(";")[0];

  const me = await request(app).get("/api/auth/me").set("Cookie", cookie);

  assert.equal(me.status, 200);
  assert.equal(me.body.success, true);
  assert.equal(me.body.data.email, userA.email);

  const search = await request(app)
    .get("/api/users/search?q=bob")
    .set("Cookie", cookie);

  assert.equal(search.status, 200);
  assert.equal(search.body.success, true);
  assert.ok(Array.isArray(search.body.data));

  const conversation = await request(app)
    .post("/api/conversations")
    .set("Cookie", cookie)
    .send({ userId: registerB.body.data.user.id, type: "DIRECT" });

  assert.equal(conversation.status, 201);
  assert.equal(conversation.body.success, true);
  assert.equal(conversation.body.data.type, "DIRECT");

  const conversationId = conversation.body.data.id;
  const firstMessage = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set("Cookie", cookie)
    .send({ content: "Hello there!" });

  assert.equal(firstMessage.status, 201);
  assert.equal(firstMessage.body.success, true);
  assert.equal(firstMessage.body.data.content, "Hello there!");

  const messages = await request(app)
    .get(`/api/conversations/${conversationId}/messages?page=1&limit=10`)
    .set("Cookie", cookie);

  assert.equal(messages.status, 200);
  assert.equal(messages.body.success, true);
  assert.ok(messages.body.data.items.length >= 1);

  const group = await request(app)
    .post("/api/groups")
    .set("Cookie", cookie)
    .send({
      name: "Demo Crew",
      description: "Test group",
      memberIds: [registerB.body.data.user.id],
    });

  assert.equal(group.status, 201);
  assert.equal(group.body.success, true);
  assert.equal(group.body.data.name, "Demo Crew");

  const groupId = group.body.data.id;
  const groupDetails = await request(app)
    .get(`/api/groups/${groupId}`)
    .set("Cookie", cookie);

  assert.equal(groupDetails.status, 200);
  assert.equal(groupDetails.body.success, true);
  assert.equal(groupDetails.body.data.name, "Demo Crew");

  const logout = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", cookie);
  assert.equal(logout.status, 200);
  assert.equal(logout.body.success, true);
});

test("message sender ID consistency (alignment bug fix)", async () => {
  const app = await createApp();

  const unique = Date.now() + 2;
  const userA = {
    name: "Alice Alignment Test",
    email: `alice-align.${unique}@example.com`,
    password: "Password123!",
  };

  const userB = {
    name: "Bob Alignment Test",
    email: `bob-align.${unique}@example.com`,
    password: "Password123!",
  };

  const registerA = await request(app).post("/api/auth/register").send(userA);
  assert.equal(registerA.status, 201);
  const userAId = registerA.body.data.user.id;
  assert.ok(typeof userAId === "string", "User ID should be a string");

  const registerB = await request(app).post("/api/auth/register").send(userB);
  assert.equal(registerB.status, 201);

  const loginA = await request(app).post("/api/auth/login").send({
    email: userA.email,
    password: userA.password,
  });

  assert.equal(loginA.status, 200);
  const cookie = loginA.headers["set-cookie"][0].split(";")[0];

  const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.id, userAId, "Current user ID should match");

  const conversation = await request(app)
    .post("/api/conversations")
    .set("Cookie", cookie)
    .send({ userId: registerB.body.data.user.id, type: "DIRECT" });

  assert.equal(conversation.status, 201);
  const conversationId = conversation.body.data.id;

  // Send a message
  const sentMessage = await request(app)
    .post(`/api/conversations/${conversationId}/messages`)
    .set("Cookie", cookie)
    .send({ content: "Alignment test message" });

  assert.equal(sentMessage.status, 201);
  assert.equal(sentMessage.body.success, true);
  const createdMessageSenderId = sentMessage.body.data.senderId;

  // Verify: created message sender ID should match current user ID
  assert.equal(
    createdMessageSenderId,
    userAId,
    "Created message senderId should match current user ID",
  );
  assert.equal(
    typeof createdMessageSenderId,
    "string",
    "Message senderId should be a string",
  );

  // Retrieve messages
  const messages = await request(app)
    .get(`/api/conversations/${conversationId}/messages?page=1&limit=10`)
    .set("Cookie", cookie);

  assert.equal(messages.status, 200);
  assert.ok(messages.body.data.items.length >= 1);

  // Verify: all retrieved messages have correct sender ID format
  const messageFromList = messages.body.data.items.find(
    (m) => m.id === sentMessage.body.data.id,
  );
  assert.ok(messageFromList, "Sent message should be in the list");
  assert.equal(
    messageFromList.senderId,
    userAId,
    "Retrieved message senderId should match current user ID",
  );
  assert.equal(
    typeof messageFromList.senderId,
    "string",
    "Retrieved message senderId should be a string",
  );

  // Verify: consistency between created and retrieved messages
  assert.equal(
    messageFromList.senderId,
    createdMessageSenderId,
    "Sender ID should be consistent between created and retrieved messages",
  );
});

test("missing group route returns 404", async () => {
  const app = await createApp();

  const unique = Date.now() + 1;
  const user = {
    name: "Grace Demo",
    email: `grace.${unique}@example.com`,
    password: "Password123!",
  };

  const register = await request(app).post("/api/auth/register").send(user);
  assert.equal(register.status, 201);

  const login = await request(app).post("/api/auth/login").send({
    email: user.email,
    password: user.password,
  });

  assert.equal(login.status, 200);
  const cookie = login.headers["set-cookie"][0].split(";")[0];

  const missingGroup = await request(app)
    .get("/api/groups/conversation_missing_id")
    .set("Cookie", cookie);

  assert.equal(missingGroup.status, 404);
  assert.equal(missingGroup.body.success, false);
  assert.equal(missingGroup.body.message, "Group not found.");
});
