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
  gpca_list_cards,
  gpca_supported_cards,
  gpca_order_virtual_card,
  gpca_bind_card,
  gpca_activate_card,
  gpca_freeze_card,
  gpca_change_pin,
  gpca_reset_pin,
  gpca_get_cvv,
  gpca_card_transactions,
} from "../tools/cards.js";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

function loginSession() {
  updateSession({
    isAuthenticated: true,
    token: "test-token",
    secretKey: "VbI1OP9FooZWudxCiqj735mBl3hPrzk8",
    email: "test@gpca.io",
  });
}

describe("card tools", () => {
  beforeEach(() => {
    resetSession();
    vi.clearAllMocks();
  });

  describe("认证检查", () => {
    it("未认证时所有卡操作应返回错误", async () => {
      const results = await Promise.all([
        gpca_list_cards(),
        gpca_supported_cards(),
        gpca_order_virtual_card("type1"),
        gpca_bind_card("card1"),
        gpca_activate_card("card1"),
        gpca_freeze_card("card1"),
        gpca_change_pin("card1", "1234", "5678"),
        gpca_reset_pin("card1"),
        gpca_get_cvv("card1"),
        gpca_card_transactions("card1"),
      ]);

      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.message).toContain("Not authenticated");
      });
    });
  });

  describe("gpca_list_cards", () => {
    beforeEach(() => loginSession());

    it("成功列出卡片", async () => {
      mockGet.mockResolvedValue({
        status: "ok",
        data: [
          { id: "c1", number: "4111111111111111", balance: 500 },
          { id: "c2", number: "5222222222222222", balance: 200 },
        ],
      });

      const result = await gpca_list_cards();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("API 错误应返回失败", async () => {
      mockGet.mockResolvedValue({
        status: "error",
        data: { errorMessage: "Service unavailable" },
      });

      const result = await gpca_list_cards();
      expect(result.success).toBe(false);
      expect(result.message).toBe("Service unavailable");
    });
  });

  describe("gpca_order_virtual_card", () => {
    beforeEach(() => loginSession());

    it("成功申请虚拟卡", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: { card_id: "new_card" } });
      const result = await gpca_order_virtual_card("visa_virtual");
      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith("/card/order_virtual_card", {
        card_type_id: "visa_virtual",
      });
    });
  });

  describe("gpca_bind_card", () => {
    beforeEach(() => loginSession());

    it("应只传递 card_id（不传多余参数）", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      await gpca_bind_card("card123");
      expect(mockPost).toHaveBeenCalledWith("/card/bind_bank_card", {
        card_id: "card123",
      });
    });
  });

  describe("gpca_change_pin", () => {
    beforeEach(() => loginSession());

    it("成功修改 PIN", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      const result = await gpca_change_pin("c1", "1234", "5678");
      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith("/card/change_card_pin", {
        card_id: "c1",
        old_pin: "1234",
        new_pin: "5678",
      });
    });
  });

  describe("gpca_card_transactions", () => {
    beforeEach(() => loginSession());

    it("仅 card_id 获取交易", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: [] });
      await gpca_card_transactions("c1");
      expect(mockGet).toHaveBeenCalledWith("/card/get_card_transaction", {
        card_id: "c1",
      });
    });

    it("带日期范围", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: [{ id: 1 }] });
      await gpca_card_transactions("c1", "2026-03-01", "2026-03-17");
      expect(mockGet).toHaveBeenCalledWith("/card/get_card_transaction", {
        card_id: "c1",
        start_time: "2026-03-01",
        end_time: "2026-03-17",
      });
    });
  });

  describe("网络异常处理", () => {
    beforeEach(() => loginSession());

    it("网络错误应返回安全消息", async () => {
      mockGet.mockRejectedValue(new Error("ECONNREFUSED"));
      const result = await gpca_list_cards();
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });
});
