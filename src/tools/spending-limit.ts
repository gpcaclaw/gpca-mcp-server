import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAuth } from "../utils.js";
import { getSession } from "../session.js";

// ── Types ──

interface SpendingLimits {
  per_transaction?: number;
  daily?: number;
  monthly?: number;
}

interface SpendingRecord {
  amount: number;
  timestamp: string;
  description: string;
}

type LimitsStore = Record<string, SpendingLimits>;
type SpendingStore = Record<string, SpendingRecord[]>;

// ── File I/O ──

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getDataDir(): string {
  const dir =
    process.env.GPCA_DATA_DIR ?? resolve(__dirname, "../../data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function readJson<T>(filename: string, fallback: T): T {
  const filepath = resolve(getDataDir(), filename);
  if (!existsSync(filepath)) return fallback;
  try {
    return JSON.parse(readFileSync(filepath, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filename: string, data: unknown): void {
  const filepath = resolve(getDataDir(), filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

function readLimits(): LimitsStore {
  return readJson<LimitsStore>("limits.json", {});
}

function writeLimits(data: LimitsStore): void {
  writeJson("limits.json", data);
}

function readSpending(): SpendingStore {
  return readJson<SpendingStore>("spending.json", {});
}

function writeSpending(data: SpendingStore): void {
  writeJson("spending.json", data);
}

// ── Helpers ──

function getUserEmail(): string | null {
  const session = getSession();
  return session.isAuthenticated ? session.email : null;
}

function filterByDay(records: SpendingRecord[]): SpendingRecord[] {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return records.filter((r) => new Date(r.timestamp) >= startOfDay);
}

function filterByMonth(records: SpendingRecord[]): SpendingRecord[] {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  return records.filter((r) => new Date(r.timestamp) >= startOfMonth);
}

function sumAmounts(records: SpendingRecord[]): number {
  return records.reduce((sum, r) => sum + r.amount, 0);
}

// ── Tool Functions ──

export async function gpca_set_spending_limit(
  per_transaction?: number,
  daily?: number,
  monthly?: number
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  if (
    per_transaction === undefined &&
    daily === undefined &&
    monthly === undefined
  ) {
    return {
      success: false,
      message:
        "At least one limit must be provided: per_transaction, daily, or monthly.",
    };
  }

  for (const [key, val] of Object.entries({
    per_transaction,
    daily,
    monthly,
  })) {
    if (val !== undefined && (typeof val !== "number" || val <= 0)) {
      return {
        success: false,
        message: `${key} must be a positive number. Got: ${val}`,
      };
    }
  }

  const email = getUserEmail()!;
  const limits = readLimits();
  const current = limits[email] ?? {};

  if (per_transaction !== undefined) current.per_transaction = per_transaction;
  if (daily !== undefined) current.daily = daily;
  if (monthly !== undefined) current.monthly = monthly;

  limits[email] = current;
  writeLimits(limits);

  return {
    success: true,
    data: current,
    message: "Spending limits updated successfully.",
  };
}

export async function gpca_get_spending_limits() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  const email = getUserEmail()!;
  const limits = readLimits();
  const userLimits = limits[email] ?? {};
  const spending = readSpending();
  const records = spending[email] ?? [];

  const todaySpent = sumAmounts(filterByDay(records));
  const monthSpent = sumAmounts(filterByMonth(records));

  const remaining: Record<string, number> = {};
  if (userLimits.per_transaction !== undefined) {
    remaining.per_transaction = userLimits.per_transaction;
  }
  if (userLimits.daily !== undefined) {
    remaining.daily = Math.max(0, userLimits.daily - todaySpent);
  }
  if (userLimits.monthly !== undefined) {
    remaining.monthly = Math.max(0, userLimits.monthly - monthSpent);
  }

  return {
    success: true,
    data: {
      limits: userLimits,
      spent: { today: todaySpent, month: monthSpent },
      remaining,
    },
  };
}

export async function gpca_spending_summary(period?: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  const p = period ?? "today";
  if (!["today", "month", "all"].includes(p)) {
    return {
      success: false,
      message: `Invalid period: "${p}". Must be "today", "month", or "all".`,
    };
  }

  const email = getUserEmail()!;
  const spending = readSpending();
  const allRecords = spending[email] ?? [];

  let filtered: SpendingRecord[];
  if (p === "today") {
    filtered = filterByDay(allRecords);
  } else if (p === "month") {
    filtered = filterByMonth(allRecords);
  } else {
    filtered = allRecords;
  }

  return {
    success: true,
    data: {
      period: p,
      total: sumAmounts(filtered),
      count: filtered.length,
      records: filtered,
    },
  };
}

export async function gpca_remove_spending_limit(type: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  const validTypes = ["per_transaction", "daily", "monthly", "all"];
  if (!validTypes.includes(type)) {
    return {
      success: false,
      message: `Invalid type: "${type}". Must be one of: ${validTypes.join(", ")}`,
    };
  }

  const email = getUserEmail()!;
  const limits = readLimits();
  const current = limits[email] ?? {};

  if (type === "all") {
    delete limits[email];
  } else {
    delete (current as any)[type];
    limits[email] = current;
  }

  writeLimits(limits);

  return {
    success: true,
    message:
      type === "all"
        ? "All spending limits removed."
        : `${type} spending limit removed.`,
  };
}

export async function gpca_record_spending(
  amount: number,
  description: string
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  if (typeof amount !== "number" || amount <= 0) {
    return { success: false, message: `amount must be a positive number.` };
  }
  if (!description || typeof description !== "string") {
    return { success: false, message: `description is required.` };
  }

  const email = getUserEmail()!;
  const spending = readSpending();
  if (!spending[email]) spending[email] = [];

  const record: SpendingRecord = {
    amount,
    timestamp: new Date().toISOString(),
    description,
  };

  spending[email].push(record);
  writeSpending(spending);

  return {
    success: true,
    data: record,
    message: `Spending of $${amount.toFixed(2)} recorded.`,
  };
}
