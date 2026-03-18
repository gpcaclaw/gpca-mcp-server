import { apiClient } from "../api-client.js";
import { handleResponse, handleError } from "../utils.js";

export async function gpca_notification_list(page?: number) {
  try {
    const params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    const res = await apiClient.get("/common/get_notification_list", params, {
      notKey: true,
    });
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_notification_detail(id: string) {
  try {
    const res = await apiClient.get(
      "/common/get_notification_detail",
      { id },
      { notKey: true }
    );
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}
