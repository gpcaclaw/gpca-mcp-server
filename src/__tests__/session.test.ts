import { describe, it, expect, beforeEach } from "vitest";
import { getSession, updateSession, resetSession } from "../session.js";

describe("session", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("getSession", () => {
    it("初始状态应为未认证", () => {
      const session = getSession();
      expect(session.isAuthenticated).toBe(false);
      expect(session.email).toBe("");
      expect(session.token).toBe("");
      expect(session.secretKey).toBe("");
      expect(session.login_token).toBe("");
    });
  });

  describe("updateSession", () => {
    it("应部分更新 session", () => {
      updateSession({ email: "test@example.com" });
      const session = getSession();
      expect(session.email).toBe("test@example.com");
      expect(session.isAuthenticated).toBe(false); // 其他字段不变
    });

    it("应同时更新多个字段", () => {
      updateSession({
        email: "user@gpca.io",
        token: "abc123",
        secretKey: "key-32-chars-long-aaaaaaaaaaaa",
        isAuthenticated: true,
      });
      const session = getSession();
      expect(session.email).toBe("user@gpca.io");
      expect(session.token).toBe("abc123");
      expect(session.isAuthenticated).toBe(true);
    });

    it("多次更新应累积", () => {
      updateSession({ email: "a@b.com" });
      updateSession({ token: "token123" });
      updateSession({ isAuthenticated: true });

      const session = getSession();
      expect(session.email).toBe("a@b.com");
      expect(session.token).toBe("token123");
      expect(session.isAuthenticated).toBe(true);
    });
  });

  describe("resetSession", () => {
    it("应重置所有字段为初始值", () => {
      updateSession({
        email: "user@test.com",
        token: "token",
        secretKey: "key",
        login_token: "lt",
        isAuthenticated: true,
      });

      resetSession();

      const session = getSession();
      expect(session.email).toBe("");
      expect(session.token).toBe("");
      expect(session.secretKey).toBe("");
      expect(session.login_token).toBe("");
      expect(session.isAuthenticated).toBe(false);
    });
  });
});
