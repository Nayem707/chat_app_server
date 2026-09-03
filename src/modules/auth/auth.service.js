import argon2 from "argon2";

import { signAccessToken } from "../../utils/jwt.js";
import { authRepository } from "./auth.repository.js";
import { userRepository } from "../user/user.repository.js";
import { sanitizeUser } from "../user/user.service.js";

export const authService = {
  async register({ name, email, password }) {
    if (!name?.trim() || !email?.trim() || !password) {
      const err = new Error("Name, email, and password are required.");
      err.status = 400;
      throw err;
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      const err = new Error("User with this email already exists.");
      err.status = 409;
      throw err;
    }

    const passwordHash = await argon2.hash(password);
    const base = name.trim().toLowerCase().replace(/\s+/g, ".");
    const username = `${base}.${Math.random().toString(36).slice(2, 6)}`;

    const user = await userRepository.create({
      displayName: name.trim(),
      email: email.trim().toLowerCase(),
      username,
      passwordHash,
      isOnline: true,
    });

    const userId = user.id ?? user._id?.toString?.();
    const accessToken = signAccessToken(userId);
    return {
      accessToken,
      user: sanitizeUser(user),
      message: "Registration successful.",
    };
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      const err = new Error("Invalid email or password.");
      err.status = 401;
      throw err;
    }

    await userRepository.updateById(user._id, { isOnline: true });
    const accessToken = signAccessToken(user._id.toString());
    return {
      accessToken,
      user: sanitizeUser({ ...user, isOnline: true }),
      message: "Login successful.",
    };
  },

  async me(user) {
    return sanitizeUser(user);
  },

  revokeToken(jti) {
    authRepository.revokeToken(jti);
  },

  isTokenRevoked(jti) {
    return authRepository.isTokenRevoked(jti);
  },
};
