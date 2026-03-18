import { describe, it, expect, beforeEach } from "vitest";
import { checkAuth, handleResponse, handleError } from "../utils.js";
import { getSession, updateSession, resetSession } from "../session.js";
import { AxiosError } from "axios";

describe("utils", () => {
  beforeEach(() => {
    resetSession();
  });

  describe("checkAuth", () => {
    it("未认证时应返回错误消息", () => {
      const result = checkAuth();
      expect(result).toBe("Not authenticated. Please login first.");
    });

    it("已认证时应返回 null", () => {
      updateSession({ isAuthenticated: true });
      const result = checkAuth();
      expect(result).toBeNull();
    });
  });

  describe("handleResponse", () => {
    it("status ok 应返回成功", () => {
      const result = handleResponse({ status: "ok", data: { balance: 100 } });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ balance: 100 });
    });

    it("status error 应返回失败和错误消息", () => {
      const result = handleResponse({
        status: "error",
        data: { errorMessage: "Card not found" },
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Card not found");
    });

    it("status error 字符串 data 应直接用作消息", () => {
      const result = handleResponse({
        status: "error",
        data: "Something went wrong",
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Something went wrong");
    });

    it("status error 对象 data 无 errorMessage 应返回默认消息", () => {
      const result = handleResponse({
        status: "error",
        data: { code: 500 },
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Request failed");
    });

    it("status re_login 应重置 session", () => {
      updateSession({ isAuthenticated: true, token: "abc" });
      const result = handleResponse({ status: "re_login", data: "Session expired" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Session expired. Please login again.");

      expect(getSession().isAuthenticated).toBe(false);
    });
  });

  describe("handleError", () => {
    it("普通 Error 应返回其 message", () => {
      const result = handleError(new Error("Something broke"));
      expect(result.success).toBe(false);
      expect(result.message).toBe("Something broke");
    });

    it("非 Error 对象应返回默认消息", () => {
      const result = handleError("string error");
      expect(result.success).toBe(false);
      expect(result.message).toBe("Unknown error occurred");
    });

    it("Axios 错误应返回状态码和 API 错误详情", () => {
      const error = new AxiosError(
        "Request failed with status code 401",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        { status: 401, statusText: "Unauthorized", data: "用户/邮箱不存在", headers: {}, config: {} as any }
      );
      const result = handleError(error);
      expect(result.success).toBe(false);
      expect(result.message).toBe("API error (401): 用户/邮箱不存在");
    });

    it("Axios 网络错误应返回 network error", () => {
      const error = new AxiosError(
        "Network Error",
        "ERR_NETWORK"
      );
      const result = handleError(error);
      expect(result.success).toBe(false);
      expect(result.message).toBe("API request failed: network error");
    });
  });
});
