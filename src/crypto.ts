import CryptoJS from "crypto-js";
import { publicEncrypt, randomBytes, constants } from "node:crypto";

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtjMYEzM/tu5vq+L5i9g+
h2UOr9hqiST6/9KbRBEDyhbaWlVhyPZtxyYl+coHqbrC71bJSovVnAv9gvvX4aTo
IHr9LjsnZpOlPNNSDYCvJSWTbzCOREOpUAdneQOwgPlPeYzT+6sy6umCqzDrnFrN
njLk46feR/eh82spFRYYpvoJrm02riokORnHk/3J33Mr/l7jVje/eDw7My7/Gbp5
tohRpzESHYMXZvxKh+MTiCT4AJmCLNzJ2v3qxOhIS6EI+pKzJHHcdzRCRLPdDjgl
5HMCWXF9yZsRjwEF7yWyUFYltZTM1X0aFYi7QqdVY0R+hqLH3X+FigsERVDE0gLo
5QIDAQAB
-----END PUBLIC KEY-----`;

/**
 * AES-256-CBC encrypt (mirrors baseUtils.js encrypt)
 */
export function encrypt(
  message: string,
  secretKey: string,
  ivStr: string | number
): string {
  const key = CryptoJS.enc.Utf8.parse(secretKey);
  const iv = CryptoJS.enc.Utf8.parse(String(ivStr));
  const encrypted = CryptoJS.AES.encrypt(message, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

/**
 * AES-256-CBC decrypt (mirrors baseUtils.js decrypt)
 */
export function decrypt(
  message: string,
  secretKey: string,
  ivStr: string | number
): string {
  const key = CryptoJS.enc.Utf8.parse(secretKey);
  const iv = CryptoJS.enc.Utf8.parse(String(ivStr));
  const decrypted = CryptoJS.AES.decrypt(message, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * RSA encrypt data with GPCA public key using Node.js native crypto.
 * Uses PKCS1 padding to match the jsencrypt library behavior used in the frontend.
 */
export function rsaEncrypt(data: string): string {
  const encrypted = publicEncrypt(
    { key: PUBLIC_KEY, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(data, "utf8")
  );
  return encrypted.toString("base64");
}

/**
 * Generate cryptographically secure random string (upper/lower case letters + digits).
 * Uses node:crypto CSPRNG instead of Math.random().
 */
export function randomStr(length: number = 32): string {
  const charSet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charSet.charAt(bytes[i] % charSet.length);
  }
  return result;
}

/**
 * Generate nonce (IV) value (mirrors http.js nonce generation).
 * Note: This timestamp-derived IV is required for backend compatibility.
 * The backend decrypts using this same nonce formula.
 */
export function generateNonce(): number {
  return Math.floor(Date.now() / 1000) * 1000000;
}
