import { apiClient } from "../api-client.js";
import { checkAuth, handleResponse, handleError } from "../utils.js";
import { resetSession } from "../session.js";

const CARD_STATUS_LABELS: Record<number, string> = {
  0: "unactivated",
  1: "activated",
  2: "frozen",
  3: "cancelled",
};

export async function gpca_list_cards() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/card/show_user_cards");
    if (res.status === "re_login") {
      resetSession();
      return { success: false, message: "Session expired. Please login again." };
    }
    if (res.status !== "ok") {
      return {
        success: false,
        message: res.data?.errorMessage ?? res.data ?? "Failed to list cards",
      };
    }

    const cards = Array.isArray(res.data) ? res.data : [];
    const parsed = cards.map((card: any) => ({
      card_id: card.card_id,
      card_no: card.card_no,
      card_no_masked: card.card_no ? `**** **** **** ${card.card_no.slice(-4)}` : "",
      card_type: card.card_type,
      type: card.type,
      status: CARD_STATUS_LABELS[card.status] ?? `status_${card.status}`,
      status_code: card.status,
      card_holder: card.card_holder,
      expired_date: card.expired_date,
      balance: card.balance,
    }));

    return { success: true, data: parsed };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_supported_cards() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/card/show_supported_cards");
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_order_virtual_card(card_type_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/order_virtual_card", { card_type_id });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_bind_card(card_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/bind_bank_card", { card_id });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_activate_card(card_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/active_card", { card_id });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_freeze_card(card_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/card_on_hold", { card_id });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_change_pin(
  card_id: string,
  old_pin: string,
  new_pin: string
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/change_card_pin", {
      card_id,
      old_pin,
      new_pin,
    });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_reset_pin(card_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/reset_card_pin", { card_id });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_get_cvv(card_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/card/get_card_cvv", { card_id });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_card_transactions(
  card_id: string,
  start_time?: string,
  end_time?: string
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const params: Record<string, any> = {
      card_id,
      page: 0,
      count: 20,
    };
    if (start_time) params.start_time = start_time;
    if (end_time) params.end_time = end_time;
    const res = await apiClient.get("/card/get_card_transaction", params);
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}
