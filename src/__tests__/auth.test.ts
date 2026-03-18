import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetSession, getSession, updateSession } from "../session.js";

// Mock api-client
vi.mock("../api-client.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    getRaw: vi.fn(),
  },
}));

import { apiClient } from "../api-client.js";
import {
  gpca_login,
  gpca_verify_login,
  gpca_auth_status,
  gpca_get_user_info,
  gpca_get_captcha,
  gpca_register,
  gpca_finish_register,
  gpca_send_reset_password_email,
  gpca_reset_password,
} from "../tools/auth.js";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockGetRaw = vi.mocked((apiClient as any).getRaw);

describe("auth tools", () => {
  beforeEach(() => {
    resetSession();
    vi.clearAllMocks();
  });

  describe("gpca_login", () => {
    it("成功登录应存储 login_token", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "login_token_123" });

      const result = await gpca_login("user@test.com", "pass123");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Verification code sent");
      expect(result.message).toContain("user@test.com");

      const session = getSession();
      expect(session.login_token).toBe("login_token_123");
      expect(session.email).toBe("user@test.com");
      expect(session.isAuthenticated).toBe(false); // 还没完成验证
    });

    it("登录失败应返回错误", async () => {
      mockPost.mockResolvedValue({
        status: "error",
        data: { errorMessage: "Invalid password" },
      });

      const result = await gpca_login("user@test.com", "wrong");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid password");
    });

    it("登录前应重置 session", async () => {
      updateSession({ token: "old-token", isAuthenticated: true });
      mockPost.mockResolvedValue({ status: "ok", data: "new_token" });

      await gpca_login("new@test.com", "pass");

      const session = getSession();
      expect(session.token).toBe(""); // 旧 token 应被清除
      expect(session.isAuthenticated).toBe(false);
    });

    it("网络错误应返回错误", async () => {
      mockPost.mockRejectedValue(new Error("Network error"));

      const result = await gpca_login("user@test.com", "pass");
      expect(result.success).toBe(false);
    });

    it("应使用 notKey:true 发送明文", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "token" });
      await gpca_login("user@test.com", "pass");

      expect(mockPost).toHaveBeenCalledWith(
        "/user/login",
        { user_email: "user@test.com", password: "pass" },
        { notKey: true }
      );
    });
  });

  describe("gpca_verify_login", () => {
    it("无 login_token 时应提示先登录", async () => {
      const result = await gpca_verify_login("123456");
      expect(result.success).toBe(false);
      expect(result.message).toContain("gpca_login first");
    });

    it("验证成功应设置 token 和 secretKey", async () => {
      updateSession({ login_token: "lt_123" });
      mockPost.mockResolvedValue({
        status: "ok",
        data: { info: "real_token", email: "user@gpca.io" },
      });

      const result = await gpca_verify_login("654321");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Login successful");

      const session = getSession();
      expect(session.token).toBe("real_token");
      expect(session.email).toBe("user@gpca.io");
      expect(session.secretKey).toHaveLength(32);
      expect(session.isAuthenticated).toBe(true);
      expect(session.login_token).toBe(""); // 应清除临时 token
    });

    it("验证码错误应返回失败", async () => {
      updateSession({ login_token: "lt_123" });
      mockPost.mockResolvedValue({
        status: "error",
        data: "Invalid verification code",
      });

      const result = await gpca_verify_login("000000");
      expect(result.success).toBe(false);
    });

    it("应使用 useLoginToken 选项", async () => {
      updateSession({ login_token: "lt_123" });
      mockPost.mockResolvedValue({
        status: "ok",
        data: { info: "token", email: "e@m.com" },
      });

      await gpca_verify_login("123456");

      expect(mockPost).toHaveBeenCalledWith(
        "/user/verify_login",
        expect.objectContaining({ code: "123456", key: expect.any(String) }),
        { notKey: true, useLoginToken: true }
      );
    });
  });

  describe("gpca_auth_status", () => {
    it("未认证", async () => {
      const result = await gpca_auth_status();
      expect(result.authenticated).toBe(false);
      expect(result.email).toBeUndefined();
    });

    it("已认证", async () => {
      updateSession({ isAuthenticated: true, email: "user@gpca.io" });
      const result = await gpca_auth_status();
      expect(result.authenticated).toBe(true);
      expect(result.email).toBe("user@gpca.io");
    });
  });

  describe("gpca_get_captcha", () => {
    it("成功获取验证码图片", async () => {
      const fakeImage = Buffer.from("fake-png-data");
      mockGetRaw.mockResolvedValue(fakeImage);

      const result = await gpca_get_captcha();

      expect(result.success).toBe(true);
      expect(result.data?.image_base64).toBe(fakeImage.toString("base64"));
      expect(result.data?.mime_type).toBe("image/png");
      expect(mockGetRaw).toHaveBeenCalledWith("/user/captcha");
    });

    it("返回空数据应失败", async () => {
      mockGetRaw.mockResolvedValue(null);

      const result = await gpca_get_captcha();
      expect(result.success).toBe(false);
    });

    it("网络错误应返回错误", async () => {
      mockGetRaw.mockRejectedValue(new Error("Network error"));

      const result = await gpca_get_captcha();
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_register", () => {
    it("成功注册应返回 register_id", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "reg_id_123" });

      const result = await gpca_register(
        "new@test.com", "newuser", "pass123", "pass123", "abcd"
      );

      expect(result.success).toBe(true);
      expect(result.data?.register_id).toBe("reg_id_123");
      expect(result.message).toContain("new@test.com");
      expect(mockPost).toHaveBeenCalledWith(
        "/user/register",
        {
          email: "new@test.com",
          username: "newuser",
          password: "pass123",
          r_password: "pass123",
          validate_code: "abcd",
        },
        { notKey: true }
      );
    });

    it("带推荐码注册", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "reg_id_456" });

      await gpca_register(
        "new@test.com", "newuser", "pass123", "pass123", "abcd", "REF001"
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/user/register",
        expect.objectContaining({ recommender_code: "REF001" }),
        { notKey: true }
      );
    });

    it("注册失败应返回错误", async () => {
      mockPost.mockResolvedValue({
        status: "error",
        data: { errorMessage: "Email already exists" },
      });

      const result = await gpca_register(
        "exist@test.com", "user", "pass", "pass", "abcd"
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain("Email already exists");
    });

    it("网络错误应返回错误", async () => {
      mockPost.mockRejectedValue(new Error("Timeout"));

      const result = await gpca_register(
        "new@test.com", "user", "pass", "pass", "abcd"
      );
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_finish_register", () => {
    it("成功完成注册", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "success" });

      const result = await gpca_finish_register("reg_id_123", "654321");

      expect(result.success).toBe(true);
      expect(result.message).toContain("completed successfully");
      expect(mockPost).toHaveBeenCalledWith(
        "/user/finish_register",
        { register_id: "reg_id_123", verify_code: "654321" },
        { notKey: true }
      );
    });

    it("验证码错误应失败", async () => {
      mockPost.mockResolvedValue({
        status: "error",
        data: "Invalid verification code",
      });

      const result = await gpca_finish_register("reg_id_123", "000000");
      expect(result.success).toBe(false);
    });

    it("网络错误应返回错误", async () => {
      mockPost.mockRejectedValue(new Error("Connection refused"));

      const result = await gpca_finish_register("reg_id_123", "654321");
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_send_reset_password_email", () => {
    it("成功发送重置邮件", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "sent" });

      const result = await gpca_send_reset_password_email("user@test.com");

      expect(result.success).toBe(true);
      expect(result.message).toContain("user@test.com");
      expect(mockPost).toHaveBeenCalledWith(
        "/user/send_reset_password_email",
        { user_email: "user@test.com" },
        { notKey: true }
      );
    });

    it("邮箱不存在应失败", async () => {
      mockPost.mockResolvedValue({
        status: "error",
        data: { errorMessage: "Email not found" },
      });

      const result = await gpca_send_reset_password_email("noone@test.com");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Email not found");
    });

    it("网络错误应返回错误", async () => {
      mockPost.mockRejectedValue(new Error("Server down"));

      const result = await gpca_send_reset_password_email("user@test.com");
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_reset_password", () => {
    it("成功重置密码", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: "done" });

      const result = await gpca_reset_password("user@test.com", "123456", "newpass");

      expect(result.success).toBe(true);
      expect(result.message).toContain("reset successfully");
      expect(mockPost).toHaveBeenCalledWith(
        "/user/rest_password",
        { user_email: "user@test.com", code: "123456", new_password: "newpass" },
        { notKey: true }
      );
    });

    it("验证码错误应失败", async () => {
      mockPost.mockResolvedValue({
        status: "error",
        data: "Invalid code",
      });

      const result = await gpca_reset_password("user@test.com", "000000", "newpass");
      expect(result.success).toBe(false);
    });

    it("网络错误应返回错误", async () => {
      mockPost.mockRejectedValue(new Error("Network error"));

      const result = await gpca_reset_password("user@test.com", "123456", "newpass");
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_get_user_info", () => {
    it("未认证应返回错误", async () => {
      const result = await gpca_get_user_info();
      expect(result.success).toBe(false);
      expect(result.message).toContain("Not authenticated");
    });

    it("成功获取用户信息", async () => {
      updateSession({ isAuthenticated: true, token: "t", secretKey: "k".repeat(32) });
      mockGet.mockResolvedValue({
        status: "ok",
        data: { email: "user@gpca.io", level: 1 },
      });

      const result = await gpca_get_user_info();
      expect(result.success).toBe(true);
      expect(result.data.email).toBe("user@gpca.io");
    });

    it("re_login 应重置 session", async () => {
      updateSession({ isAuthenticated: true, token: "t", secretKey: "k".repeat(32) });
      mockGet.mockResolvedValue({ status: "re_login", data: "expired" });

      const result = await gpca_get_user_info();
      expect(result.success).toBe(false);
      expect(getSession().isAuthenticated).toBe(false);
    });
  });
});
