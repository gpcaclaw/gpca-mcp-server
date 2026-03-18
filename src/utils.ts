import { getSession, resetSession } from "./session.js";
import type { ApiResponse } from "./api-client.js";
import axios from "axios";

export interface ToolResult {
  success: boolean;
  data?: any;
  message?: string;
}

export function checkAuth(): string | null {
  const session = getSession();
  if (!session.isAuthenticated) {
    return "Not authenticated. Please login first.";
  }
  return null;
}

export function handleResponse(res: ApiResponse): ToolResult {
  if (res.status === "ok") {
    return { success: true, data: res.data };
  }
  if (res.status === "re_login") {
    resetSession();
    return { success: false, message: "Session expired. Please login again." };
  }
  return {
    success: false,
    message:
      res.data?.errorMessage ??
      (typeof res.data === "string" ? res.data : "Request failed"),
  };
}

export function handleError(error: unknown): ToolResult {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? "network error";
    const data = error.response?.data;
    // Extract meaningful error message from API response body
    const detail =
      typeof data === "string"
        ? data
        : data?.data ?? data?.message ?? data?.errorMessage ?? null;
    return {
      success: false,
      message: detail
        ? `API error (${status}): ${detail}`
        : `API request failed: ${status}`,
    };
  }
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  return { success: false, message };
}
