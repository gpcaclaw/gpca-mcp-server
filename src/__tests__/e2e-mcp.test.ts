/**
 * MCP 协议级端到端测试
 *
 * 通过 stdio 启动真实的 MCP Server 进程，使用 MCP SDK Client 发送 JSON-RPC 请求，
 * 验证服务器的完整协议行为。
 *
 * 注意：这些测试不连接真实 GPCA API（无测试账号），
 * 而是验证 MCP 协议层面的正确性：工具注册、参数校验、认证检查、错误处理。
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";

const SERVER_PATH = resolve(import.meta.dirname, "../../dist/index.js");

let client: Client;
let transport: StdioClientTransport;

beforeAll(async () => {
  transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    stderr: "pipe",
  });

  client = new Client(
    { name: "e2e-test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
}, 10000);

afterAll(async () => {
  await client.close();
});

// ── 服务器初始化 ──

describe("MCP 服务器初始化", () => {
  it("服务器应成功启动并完成握手", () => {
    // 如果 beforeAll 没抛异常，说明 initialize 握手成功
    expect(client).toBeDefined();
  });
});

// ── 工具列表 ──

describe("工具列表 (tools/list)", () => {
  it("应返回所有 46 个工具", async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(46);
  });

  it("每个工具应有 name、description 和 inputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("应包含所有认证工具", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("gpca_login");
    expect(names).toContain("gpca_verify_login");
    expect(names).toContain("gpca_auth_status");
    expect(names).toContain("gpca_get_user_info");
  });

  it("应包含所有卡工具", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const cardTools = [
      "gpca_list_cards",
      "gpca_supported_cards",
      "gpca_order_virtual_card",
      "gpca_bind_card",
      "gpca_activate_card",
      "gpca_freeze_card",
      "gpca_change_pin",
      "gpca_reset_pin",
      "gpca_get_cvv",
      "gpca_card_transactions",
    ];
    for (const name of cardTools) {
      expect(names).toContain(name);
    }
  });

  it("应包含所有钱包工具", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const walletTools = [
      "gpca_wallet_balance",
      "gpca_supported_chains",
      "gpca_deposit_address",
      "gpca_bank_card_list",
      "gpca_deposit_to_card",
      "gpca_wallet_transactions",
    ];
    for (const name of walletTools) {
      expect(names).toContain(name);
    }
  });

  it("应包含所有 KYC 工具", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    const kycTools = [
      "gpca_check_kyc",
      "gpca_request_kyc",
      "gpca_request_kyc_visa",
      "gpca_submit_kyc",
      "gpca_add_kyc_file",
      "gpca_reset_kyc",
    ];
    for (const name of kycTools) {
      expect(names).toContain(name);
    }
  });

  it("gpca_login 应要求 email 和 password 参数", async () => {
    const { tools } = await client.listTools();
    const loginTool = tools.find((t) => t.name === "gpca_login");
    expect(loginTool!.inputSchema.required).toEqual(["email", "password"]);
    expect(loginTool!.inputSchema.properties).toHaveProperty("email");
    expect(loginTool!.inputSchema.properties).toHaveProperty("password");
  });

  it("gpca_deposit_to_card 应要求 card_id 和 amount", async () => {
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "gpca_deposit_to_card");
    expect(tool!.inputSchema.required).toEqual(["card_id", "amount"]);
  });
});

// ── 工具调用：认证状态 ──

describe("工具调用：认证状态", () => {
  it("gpca_auth_status 应返回未认证", async () => {
    const result = await client.callTool({
      name: "gpca_auth_status",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.authenticated).toBe(false);
  });
});

// ── 工具调用：未认证时的保护 ──

describe("未认证时工具调用应被拒绝", () => {
  const protectedTools = [
    { name: "gpca_get_user_info", args: {} },
    { name: "gpca_list_cards", args: {} },
    { name: "gpca_supported_cards", args: {} },
    { name: "gpca_wallet_balance", args: {} },
    { name: "gpca_supported_chains", args: {} },
    { name: "gpca_bank_card_list", args: {} },
    { name: "gpca_check_kyc", args: {} },
    { name: "gpca_reset_kyc", args: {} },
    {
      name: "gpca_order_virtual_card",
      args: { card_type_id: "test" },
    },
    { name: "gpca_bind_card", args: { card_id: "test" } },
    { name: "gpca_activate_card", args: { card_id: "test" } },
    { name: "gpca_freeze_card", args: { card_id: "test" } },
    {
      name: "gpca_change_pin",
      args: { card_id: "test", old_pin: "1234", new_pin: "5678" },
    },
    { name: "gpca_reset_pin", args: { card_id: "test" } },
    { name: "gpca_get_cvv", args: { card_id: "test" } },
    { name: "gpca_card_transactions", args: { card_id: "test" } },
    {
      name: "gpca_deposit_to_card",
      args: { card_id: "test", amount: 100 },
    },
    { name: "gpca_deposit_address", args: { chain: "TRON" } },
    { name: "gpca_wallet_transactions", args: { start_time: "2026-03-01" } },
    {
      name: "gpca_request_kyc",
      args: { kyc_data: { name: "test" } },
    },
    {
      name: "gpca_request_kyc_visa",
      args: { kyc_data: { name: "test" } },
    },
    {
      name: "gpca_submit_kyc",
      args: { kyc_data: { id: "1" } },
    },
    {
      name: "gpca_add_kyc_file",
      args: { kyc_data: { api_type: 1, docType: 1, file_base64: "base64" } },
    },
    { name: "gpca_set_spending_limit", args: { daily: 100 } },
    { name: "gpca_get_spending_limits", args: {} },
    { name: "gpca_spending_summary", args: {} },
    { name: "gpca_remove_spending_limit", args: { type: "all" } },
    { name: "gpca_record_spending", args: { amount: 50, description: "Test" } },
  ];

  for (const { name, args } of protectedTools) {
    it(`${name} 应返回 Not authenticated`, async () => {
      const result = await client.callTool({ name, arguments: args });

      const content = result.content as Array<{ type: string; text: string }>;
      const data = JSON.parse(content[0].text);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Not authenticated");
    });
  }
});

// ── 登录流程 ──

describe("登录流程", () => {
  it("gpca_verify_login 未先登录应返回提示", async () => {
    const result = await client.callTool({
      name: "gpca_verify_login",
      arguments: { code: "123456" },
    });

    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.success).toBe(false);
    expect(data.message).toContain("gpca_login first");
  });
});

// ── 未知工具 ──

describe("未知工具调用", () => {
  it("应返回 Unknown tool 错误", async () => {
    const result = await client.callTool({
      name: "nonexistent_tool",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain("Unknown tool");
  });
});

// ── 响应格式 ──

describe("响应格式", () => {
  it("所有工具响应应为 JSON 文本", async () => {
    const result = await client.callTool({
      name: "gpca_auth_status",
      arguments: {},
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("text");
    // 应该是合法 JSON
    expect(() => JSON.parse(content[0].text)).not.toThrow();
  });

  it("错误响应也应为 JSON 文本", async () => {
    const result = await client.callTool({
      name: "gpca_list_cards",
      arguments: {},
    });

    const content = result.content as Array<{ type: string; text: string }>;
    expect(content).toHaveLength(1);
    expect(content[0].type).toBe("text");
    const data = JSON.parse(content[0].text);
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("message");
  });
});
