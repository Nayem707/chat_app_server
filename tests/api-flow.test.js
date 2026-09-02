import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../src/app.js";

test("register -> login -> user search -> create conversation -> messages -> group -> logout flow", async (t) => {
  const app = createApp();

  const userA = {
    name: "Alice Demo",
    email: "alice.demo@example.com",
    password: "Password123!",
  };

  const userB = {
    name: "Bob Demo",
    email: "bob.demo@example.com",
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
