import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { encrypt, generateNonce } from "./crypto.js";
import { getSession } from "./session.js";

const BASE_URL = process.env.GPCA_API_URL ?? "https://card_api.gpca.io";

export interface ApiResponse {
  status: "ok" | "error" | "re_login";
  data: any;
}

class GpcaApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 20000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private getHeaders(
    useLoginToken: boolean = false,
    nonce?: number
  ): Record<string, string> {
    const session = getSession();
    const headers: Record<string, string> = {
      "process-id":
        Math.floor(Date.now() / 1000) +
        "" +
        Math.floor(Math.random() * 1000000),
      "Content-Type": "application/json",
      "Accept-Language": "en",
    };

    if (useLoginToken && session.login_token) {
      headers["info"] = session.login_token;
    } else if (session.token) {
      headers["info"] = session.token;
    }

    if (nonce !== undefined) {
      headers["nonce"] = String(nonce);
    }

    return headers;
  }

  /**
   * POST request with encryption (mirrors http.js POST logic)
   */
  async post(
    url: string,
    data: Record<string, any>,
    options: { notKey?: boolean; useLoginToken?: boolean } = {}
  ): Promise<ApiResponse> {
    const { notKey = false, useLoginToken = false } = options;

    let requestData: any;
    let nonce: number | undefined;

    if (notKey) {
      requestData = { ...data };
    } else {
      const session = getSession();
      const secretKey = session.secretKey;
      nonce = generateNonce();
      requestData = {
        data: encrypt(JSON.stringify(data), secretKey, nonce),
      };
    }

    const headers = this.getHeaders(useLoginToken, nonce);

    const response = await this.client.post(url, requestData, { headers });
    return response.data as ApiResponse;
  }

  /**
   * GET request with encryption (mirrors http.js GET logic)
   */
  async get(
    url: string,
    params: Record<string, any> = {},
    options: { notKey?: boolean } = {}
  ): Promise<ApiResponse> {
    const { notKey = false } = options;

    let requestParams: any;
    let nonce: number | undefined;

    if (notKey) {
      requestParams = { ...params };
    } else {
      const session = getSession();
      const secretKey = session.secretKey;
      nonce = generateNonce();
      requestParams = {
        data: encrypt(JSON.stringify(params), secretKey, nonce),
      };
    }

    const headers = this.getHeaders(false, nonce);

    const response = await this.client.get(url, {
      params: requestParams,
      headers,
    });
    return response.data as ApiResponse;
  }
  /**
   * GET request returning raw response data (for binary content like captcha images)
   */
  async getRaw(url: string): Promise<Buffer> {
    const headers = this.getHeaders();
    const response = await this.client.get(url, {
      headers,
      responseType: "arraybuffer",
    });
    return Buffer.from(response.data);
  }
}

export const apiClient = new GpcaApiClient();
