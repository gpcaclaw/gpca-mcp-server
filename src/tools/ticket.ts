import { apiClient } from "../api-client.js";
import { checkAuth, handleResponse, handleError } from "../utils.js";

export async function gpca_view_all_tickets() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/ticket/view_all_ticket");
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_get_ticket_detail(ticket_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/ticket/get_ticket_detail", {
      ticket_id,
    });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_create_ticket(
  title: string,
  content: string
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/ticket/create_ticket", {
      title,
      content,
    });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_reply_ticket(
  ticket_id: string,
  content: string
) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/ticket/reply_ticket", {
      ticket_id,
      content,
    });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_close_ticket(ticket_id: string) {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/ticket/close_ticket", {
      ticket_id,
    });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}
