import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetSession, updateSession } from "../session.js";

// Mock api-client
vi.mock("../api-client.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from "../api-client.js";
import {
  gpca_wallet_balance,
  gpca_supported_chains,
  gpca_deposit_address,
  gpca_bank_card_list,
  gpca_deposit_to_card,
  gpca_wallet_transactions,
} from "../tools/wallet.js";

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

describe("wallet tools", () => {
  beforeEach(() => {
    resetSession();
    vi.clearAllMocks();
  });

  describe("gpca_deposit_to_card 输入验证", () => {
    beforeEach(() => loginSession());

    it("正数金额应通过验证", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: { tx_id: "123" } });
      const result = await gpca_deposit_to_card("card1", 100);
      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith("/wallet/deposit", { card_id: "card1", amount: 100 });
    });

    it("零金额应被拒绝", async () => {
      const result = await gpca_deposit_to_card("card1", 0);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid amount");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("负数金额应被拒绝", async () => {
      const result = await gpca_deposit_to_card("card1", -50);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid amount");
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("NaN 应被拒绝", async () => {
      const result = await gpca_deposit_to_card("card1", NaN);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid amount");
    });

    it("Infinity 应被拒绝", async () => {
      const result = await gpca_deposit_to_card("card1", Infinity);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid amount");
    });

    it("小数金额应通过", async () => {
      mockPost.mockResolvedValue({ status: "ok", data: {} });
      const result = await gpca_deposit_to_card("card1", 0.01);
      expect(result.success).toBe(true);
    });
  });

  describe("认证检查", () => {
    it("未认证时所有操作应返回错误", async () => {
      const results = await Promise.all([
        gpca_wallet_balance(),
        gpca_supported_chains(),
        gpca_deposit_address("TRON"),
        gpca_bank_card_list(),
        gpca_deposit_to_card("c1", 100),
        gpca_wallet_transactions("2026-03-01"),
      ]);

      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.message).toContain("Not authenticated");
      });
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe("gpca_wallet_balance", () => {
    beforeEach(() => loginSession());

    it("成功获取余额", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: { balance: "1234.56" } });
      const result = await gpca_wallet_balance();
      expect(result.success).toBe(true);
      expect(result.data.balance).toBe("1234.56");
    });

    it("会话过期应重置", async () => {
      mockGet.mockResolvedValue({ status: "re_login", data: "expired" });
      const result = await gpca_wallet_balance();
      expect(result.success).toBe(false);
      expect(result.message).toContain("Session expired");
    });
  });

  describe("gpca_deposit_address", () => {
    beforeEach(() => loginSession());

    it("不传 chain 应返回错误", async () => {
      const result = await gpca_deposit_address("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("chain is required");
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("传 chain 应正确传参（含 currency）", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: { address: "TXyz123" } });
      const result = await gpca_deposit_address("TRON");
      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledWith("/wallet/get_deposit_address", { chain: "TRON", currency: "USDT" });
    });
  });

  describe("gpca_wallet_transactions", () => {
    beforeEach(() => loginSession());

    it("不传 start_time 应返回错误", async () => {
      const result = await gpca_wallet_transactions("");
      expect(result.success).toBe(false);
      expect(result.message).toContain("start_time is required");
      expect(mockGet).not.toHaveBeenCalled();
    });

    it("只传 start_time", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: [] });
      const result = await gpca_wallet_transactions("2026-03-01");
      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledWith("/wallet/get_wallet_transactions", {
        start_time: "2026-03-01",
      });
    });

    it("带日期范围获取交易", async () => {
      mockGet.mockResolvedValue({ status: "ok", data: [{ id: 1 }] });
      const result = await gpca_wallet_transactions("2026-03-01", "2026-03-17");
      expect(result.success).toBe(true);
      expect(mockGet).toHaveBeenCalledWith("/wallet/get_wallet_transactions", {
        start_time: "2026-03-01",
        end_time: "2026-03-17",
      });
    });
  });
});
