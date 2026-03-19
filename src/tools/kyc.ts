import { apiClient } from "../api-client.js";
import { checkAuth, handleResponse, handleError, type ToolResult } from "../utils.js";
import { resetSession } from "../session.js";
import { autoConvertKycFields, containsChinese, addressToPinyin, nameToPinyin } from "../pinyin.js";
import { compressKycImages } from "../image.js";

const KYC_TYPE_LABELS: Record<number, string> = {
  1: "Mastercard",
  2: "Visa",
  3: "Virtual Card",
};

const KYC_STATUS_LABELS: Record<number, string> = {
  0: "not_started",
  1: "info_submitted",
  2: "under_review",
  3: "rejected",
  4: "approved",
};

/**
 * Check KYC verification status.
 * Returns parsed status with human-readable labels.
 */
export async function gpca_check_kyc() {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.get("/user/check_user_kyc");
    if (res.status === "re_login") {
      resetSession();
      return { success: false, message: "Session expired. Please login again." };
    }
    if (res.status !== "ok") {
      return {
        success: false,
        message: res.data?.errorMessage ?? res.data ?? "Failed to check KYC",
      };
    }

    const entries = Array.isArray(res.data) ? res.data : [];
    const parsed = entries.map((item: any) => ({
      card_type: KYC_TYPE_LABELS[item.api_type] ?? `type_${item.api_type}`,
      status: KYC_STATUS_LABELS[item.status] ?? `status_${item.status}`,
      status_code: item.status,
      api_type: item.api_type,
      holder_id: item.holder_id,
      refuse_reason: item.refuse_message || null,
      updated_at: item.update_time,
    }));

    const summary = parsed
      .map((p: any) => `${p.card_type}: ${p.status}${p.refuse_reason ? ` (reason: ${p.refuse_reason})` : ""}`)
      .join("\n");

    return {
      success: true,
      data: parsed,
      message: `KYC Status:\n${summary}`,
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Get available countries/nationalities for KYC.
 * Returns list of { name, iso2, iso3, tel } objects.
 */
export async function gpca_get_countries() {
  try {
    const res = await apiClient.get(
      "/common/get_country_information",
      {},
      { notKey: true }
    );
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * KYC Step 1 (Mastercard): Update user personal information.
 * Calls /user/update_user_information.
 * For Visa/Virtual, data is collected and sent together via gpca_request_kyc_visa.
 *
 * All text fields must be in English/Pinyin. Chinese input is auto-converted.
 */
export async function gpca_request_kyc(kyc_data: Record<string, any>): Promise<ToolResult> {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  // Auto-convert Chinese to Pinyin
  const data = autoConvertKycFields(kyc_data);

  try {
    const res = await apiClient.post("/user/update_user_information", data);
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * KYC for Visa/Virtual Card: Submit all KYC data in one call.
 * Calls /user/request_kyc2.
 *
 * Required fields:
 * - Personal: firstName, lastName, gender (0=male,1=female), dob (YYYY-MM-DD),
 *   nationality, adrLine1, city, state, country (iso3), zipCode,
 *   phoneNum, callingCode, countryCallingCode (iso2), placeOfBirth (iso3)
 * - Document: api_type (2 or 3), doc_type (1=passport, 4=national_id),
 *   code (ID number), issue (YYYY-MM-DD), expire (YYYY-MM-DD),
 *   obverse (base64 front photo), handhold (base64 holding-ID selfie)
 * - Optional: midName, adrLine2, reverse (base64 back photo, required if doc_type=4),
 *   employeeID (required if country=USA), reason
 *
 * Chinese text fields are auto-converted to Pinyin.
 */
export async function gpca_request_kyc_visa(kyc_data: Record<string, any>): Promise<ToolResult> {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  // Auto-convert Chinese to Pinyin
  let data = autoConvertKycFields(kyc_data);
  // Compress images (obverse, reverse, handhold)
  data = await compressKycImages(data);

  try {
    const res = await apiClient.post("/user/request_kyc2", data);
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Submit KYC for final review (Mastercard only, after all steps complete).
 */
export async function gpca_submit_kyc(kyc_data: Record<string, any>): Promise<ToolResult> {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/user/submit_kyc", kyc_data);
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Upload a KYC verification document (Mastercard flow).
 *
 * For ID document:
 *   { api_type: 1, docType: 1|4, language: "ENG", number, issueBy,
 *     issureDate: "YYYY-MM-DD", expireDate: "YYYY-MM-DD", file_base64 }
 *
 * For address proof:
 *   { api_type: 1, docType: 5|6|7|8, language: "ENG", number, issueBy,
 *     issureDate: "YYYY-MM-DD", file_base64 }
 *
 * docType: 1=Passport, 4=National ID, 5=Credit Card Statement,
 *          6=Utility Bill, 7=Bank Statement, 8=Bank Letter
 *
 * Chinese text fields are auto-converted to Pinyin.
 */
export async function gpca_add_kyc_file(kyc_data: Record<string, any>): Promise<ToolResult> {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  // Auto-convert Chinese to Pinyin for text fields
  let data = autoConvertKycFields(kyc_data);
  // Compress images (file_base64)
  data = await compressKycImages(data);

  try {
    const res = await apiClient.post("/user/add_kyc_file", data);
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Reset KYC data to start the verification process over.
 */
export async function gpca_reset_kyc(): Promise<ToolResult> {
  const authErr = checkAuth();
  if (authErr) return { success: false, message: authErr };

  try {
    const res = await apiClient.post("/user/reset_kyc_data", {});
    return handleResponse(res);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Convert Chinese text to Pinyin.
 * Utility tool for previewing how Chinese input will be converted.
 */
export async function gpca_chinese_to_pinyin(
  text: string,
  type?: string
): Promise<ToolResult> {
  if (!text) return { success: false, message: "text is required." };

  const t = type ?? "address";
  let result: string;
  if (t === "name") {
    result = nameToPinyin(text);
  } else {
    result = addressToPinyin(text);
  }

  return {
    success: true,
    data: {
      original: text,
      pinyin: result,
      has_chinese: containsChinese(text),
    },
    message: containsChinese(text)
      ? `Converted: "${text}" → "${result}"`
      : `No Chinese characters detected, text unchanged.`,
  };
}
