import { apiClient } from "../api-client.js";
import { checkAuth, handleResponse, handleError } from "../utils.js";

export async function gpca_wallet_balance() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/wallet/get_wallet_balance");
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_supported_chains() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/wallet/get_support_chain");
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_deposit_address(chain: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  if (!chain) {
    return { success: false, message: "chain is required. Use gpca_supported_chains to get available chains (e.g. 'TRON', 'BSC')." };
  }

  try {
    const res = await apiClient.get("/wallet/get_deposit_address", { chain, currency: "USDT" });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_bank_card_list() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/wallet/get_bank_card_list");
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_deposit_to_card(card_id: string, amount: number) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, message: "Invalid amount: must be a positive number." };
  }

  try {
    const res = await apiClient.post("/wallet/deposit", { card_id, amount });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_wallet_transactions(
  start_time: string,
  end_time?: string
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  if (!start_time) {
    return { success: false, message: "start_time is required (YYYY-MM-DD format)." };
  }

  try {
    const params: Record<string, string> = { start_time };
    if (end_time) params.end_time = end_time;
    const res = await apiClient.get("/wallet/get_wallet_transactions", params);
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}
