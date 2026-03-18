import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetSession, updateSession } from "../session.js";

vi.mock("../api-client.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from "../api-client.js";
import {
  gpca_check_kyc,
  gpca_get_countries,
  gpca_request_kyc,
  gpca_request_kyc_visa,
  gpca_submit_kyc,
  gpca_add_kyc_file,
  gpca_reset_kyc,
  gpca_chinese_to_pinyin,
} from "../tools/kyc.js";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

function loginSession() {
  updateSession({
    isAuthenticated: true,
    token: "test-token",
    secretKey: "VbI1OP9FooZWudxCiqj735mBl3hPrzk8",
  });
}

describe("kyc tools", () => {
  beforeEach(() => {
    resetSession();
    vi.clearAllMocks();
  });

  describe("认证检查", () => {
    it("未认证时所有 KYC 操作应返回错误", async () => {
      const results = await Promise.all([
        gpca_check_kyc(),
        gpca_request_kyc({ name: "test" }),
        gpca_request_kyc_visa({ name: "test" }),
        gpca_submit_kyc({ id: "1" }),
        gpca_add_kyc_file({ file_base64: "base64data" }),
        gpca_reset_kyc(),
      ]);
      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.message).toContain("Not authenticated");
      });
    });
  });

  describe("gpca_check_kyc", () => {
    beforeEach(() => loginSession());

    it("成功查询 KYC 状态", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: { kyc_status: "approved" } });
      const result = await gpca_check_kyc();
      expect(result.success).toBe(true);
      expect(result.data.kyc_status).toBe("approved");
    });

    it("API 错误", async () => {
      mockGet.mockResolvedValue({ status: "error", data: "KYC service unavailable" });
      const result = await gpca_check_kyc();
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_get_countries", () => {
    it("成功获取国家列表", async () => {
      mockGet.mockResolvedValue({
        status: "ok",
        data: [{ name: "China", iso2: "CN", iso3: "CHN", tel: "86" }],
      });
      const result = await gpca_get_countries();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockGet).toHaveBeenCalledWith(
        "/common/get_country_information",
        {},
        { notKey: true }
      );
    });
  });

  describe("gpca_request_kyc", () => {
    beforeEach(() => loginSession());

    it("成功发起 Mastercard KYC（调用 update_user_information）", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      const result = await gpca_request_kyc({ firstName: "John", lastName: "Doe" });
      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith("/user/update_user_information", {
        firstName: "John",
        lastName: "Doe",
      });
    });

    it("中文姓名自动转拼音", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      await gpca_request_kyc({ firstName: "善林", lastName: "张" });
      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[0]).toBe("/user/update_user_information");
      expect(callArgs[1].firstName).toBe("Shanlin");
      expect(callArgs[1].lastName).toBe("Zhang");
    });
  });

  describe("gpca_request_kyc_visa", () => {
    beforeEach(() => loginSession());

    it("成功发起 Visa KYC", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      await gpca_request_kyc_visa({ firstName: "Test", api_type: 2 });
      expect(mockPost).toHaveBeenCalledWith("/user/request_kyc2", {
        firstName: "Test",
        api_type: 2,
      });
    });
  });

  describe("gpca_add_kyc_file", () => {
    beforeEach(() => loginSession());

    it("成功上传 KYC 文件", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: { file_id: "f1" } });
      const result = await gpca_add_kyc_file({
        api_type: 1,
        docType: 1,
        language: "ENG",
        number: "G12345678",
        issueBy: "Ministry of Public Security",
        issureDate: "2020-01-01",
        expireDate: "2030-01-01",
        file_base64: "aGVsbG8=",
      });
      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith("/user/add_kyc_file", {
        api_type: 1,
        docType: 1,
        language: "ENG",
        number: "G12345678",
        issueBy: "Ministry of Public Security",
        issureDate: "2020-01-01",
        expireDate: "2030-01-01",
        file_base64: "aGVsbG8=",
      });
    });
  });

  describe("gpca_chinese_to_pinyin", () => {
    it("转换中文地址", async () => {
      const result = await gpca_chinese_to_pinyin("重庆市", "address");
      expect(result.success).toBe(true);
      expect(result.data.has_chinese).toBe(true);
      expect(result.data.pinyin).toContain("Chong");
    });

    it("英文不转换", async () => {
      const result = await gpca_chinese_to_pinyin("New York", "address");
      expect(result.success).toBe(true);
      expect(result.data.has_chinese).toBe(false);
      expect(result.data.pinyin).toBe("New York");
    });

    it("空文本返回错误", async () => {
      const result = await gpca_chinese_to_pinyin("", "name");
      expect(result.success).toBe(false);
    });
  });

  describe("gpca_reset_kyc", () => {
    beforeEach(() => loginSession());

    it("成功重置 KYC", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      const result = await gpca_reset_kyc();
      expect(result.success).toBe(true);
    });

    it("网络异常", async () => {
      mockPost.mockRejectedValue(new Error("timeout"));
      const result = await gpca_reset_kyc();
      expect(result.success).toBe(false);
    });
  });
});
