import { apiClient } from "../api-client.js";
import { randomStr, rsaEncrypt } from "../crypto.js";
import { getSession, updateSession, resetSession } from "../session.js";
import { handleError } from "../utils.js";

export async function gpca_login(
  email: string,
  password: string
) {
  try {
    resetSession();
    const res = await apiClient.post(
      "/user/login",
      { user_email: email, password },
      { notKey: true }
    );

    if (res.status === "ok") {
      updateSession({
        email,
        login_token: res.data,
        isAuthenticated: false,
      });
      return {
        success: true,
        message: `Verification code sent to ${email}. Please provide the code to complete login.`,
      };
    }

    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Login failed",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_verify_login(
  code: string
) {
  try {
    const session = getSession();
    if (!session.login_token) {
      return {
        success: false,
        message:
          "No pending login. Please call gpca_login first with email and password.",
      };
    }

    const secretKey = randomStr(32);
    const encryptedKey = rsaEncrypt(secretKey);

    const res = await apiClient.post(
      "/user/verify_login",
      { code, key: encryptedKey },
      { notKey: true, useLoginToken: true }
    );

    if (res.status === "ok") {
      updateSession({
        login_token: "",
        token: res.data.info,
        email: res.data.email,
        secretKey,
        isAuthenticated: true,
      });
      return {
        success: true,
        message: `Login successful. Welcome, ${res.data.email}!`,
        email: res.data.email,
      };
    }

    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Verification failed",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_get_captcha() {
  try {
    const res = await apiClient.getRaw("/user/captcha");
    if (res) {
      // Convert image buffer to base64
      const base64 = Buffer.from(res).toString("base64");
      return {
        success: true,
        data: { image_base64: base64, mime_type: "image/png" },
        message: "Captcha image retrieved. Display it to the user and ask them to enter the code.",
      };
    }
    return { success: false, message: "Failed to get captcha image" };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_register(
  email: string,
  username: string,
  password: string,
  r_password: string,
  validate_code: string,
  recommender_code?: string
) {
  try {
    const data: Record<string, any> = {
      email,
      username,
      password,
      r_password,
      validate_code,
    };
    if (recommender_code) {
      data.recommender_code = recommender_code;
    }

    const res = await apiClient.post("/user/register", data, { notKey: true });

    if (res.status === "ok") {
      return {
        success: true,
        data: { register_id: res.data },
        message: `Registration email sent to ${email}. Please provide the email verification code to complete registration.`,
      };
    }

    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Registration failed",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_finish_register(
  register_id: string,
  verify_code: string
) {
  try {
    const res = await apiClient.post(
      "/user/finish_register",
      { register_id, verify_code },
      { notKey: true }
    );

    if (res.status === "ok") {
      return {
        success: true,
        message: "Registration completed successfully! You can now log in with your email and password.",
      };
    }

    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Registration verification failed",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_send_reset_password_email(email: string) {
  try {
    const res = await apiClient.post(
      "/user/send_reset_password_email",
      { user_email: email },
      { notKey: true }
    );

    if (res.status === "ok") {
      return {
        success: true,
        message: `Password reset email sent to ${email}. Please provide the verification code and new password.`,
      };
    }

    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Failed to send reset email",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_reset_password(
  email: string,
  code: string,
  new_password: string
) {
  try {
    const res = await apiClient.post(
      "/user/rest_password",
      { user_email: email, code, new_password },
      { notKey: true }
    );

    if (res.status === "ok") {
      return {
        success: true,
        message: "Password reset successfully! You can now log in with your new password.",
      };
    }

    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Password reset failed",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_auth_status(): Promise<{
  authenticated: boolean;
  email?: string;
}> {
  const session = getSession();
  return {
    authenticated: session.isAuthenticated,
    email: session.isAuthenticated ? session.email : undefined,
  };
}

const WEB_URL = process.env.GPCA_WEB_URL ?? "https://card.gpca.io";

export async function gpca_invite_link(): Promise<{
  success: boolean;
  data?: { invite_code: string; invite_url: string };
  message?: string;
}> {
  const session = getSession();
  if (!session.isAuthenticated) {
    return { success: false, message: "Not authenticated. Please login first." };
  }

  try {
    const res = await apiClient.get("/user/get_user_info");
    if (res.status === "ok" && res.data?.invite_code) {
      const invite_code = res.data.invite_code;
      const invite_url = `${WEB_URL}/signup?code=${invite_code}`;
      return {
        success: true,
        data: { invite_code, invite_url },
        message: `Your invite code: ${invite_code}\nInvite link: ${invite_url}`,
      };
    }
    if (res.status === "re_login") {
      resetSession();
      return { success: false, message: "Session expired. Please login again." };
    }
    return {
      success: false,
      message: "Could not retrieve invite code. User info may be incomplete.",
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function gpca_get_user_info(): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  const session = getSession();
  if (!session.isAuthenticated) {
    return { success: false, message: "Not authenticated. Please login first." };
  }

  try {
    const res = await apiClient.get("/user/get_user_info");
    if (res.status === "ok") {
      return { success: true, data: res.data };
    }
    if (res.status === "re_login") {
      resetSession();
      return { success: false, message: "Session expired. Please login again." };
    }
    return {
      success: false,
      message: res.data?.errorMessage || res.data || "Failed to get user info",
    };
  } catch (error) {
    return handleError(error);
  }
}
