/**
 * Image compression utility for KYC document uploads.
 *
 * Mirrors the frontend's compressImage behavior:
 *   - Max dimensions: 1024 × 1024 (preserving aspect ratio)
 *   - Output format: JPEG
 *   - Quality: 70%
 *   - Returns pure base64 string (no data:image/jpeg;base64, prefix)
 */

import sharp from "sharp";

const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const JPEG_QUALITY = 70;

/**
 * Compress a base64-encoded image to JPEG, resized to fit within 1024×1024.
 *
 * Accepts base64 with or without the data URI prefix.
 * Returns pure base64 string (without prefix).
 *
 * If compression fails (e.g., invalid image), returns the original base64 unchanged.
 */
export async function compressImage(base64Input: string): Promise<string> {
  try {
    // Strip data URI prefix if present
    const pure = base64Input.replace(/^data:image\/[a-z]+;base64,/, "");

    const inputBuffer = Buffer.from(pure, "base64");

    const outputBuffer = await sharp(inputBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: "inside",           // Scale down to fit, don't crop
        withoutEnlargement: true, // Don't upscale small images
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return outputBuffer.toString("base64");
  } catch {
    // On failure, return original (stripped of prefix)
    return base64Input.replace(/^data:image\/[a-z]+;base64,/, "");
  }
}

/**
 * Compress all base64 image fields in a KYC data object.
 * Detects fields that contain base64 image data and compresses them.
 *
 * Known image fields: file_base64, obverse, reverse, handhold
 */
export async function compressKycImages(
  data: Record<string, any>
): Promise<Record<string, any>> {
  const imageFields = ["file_base64", "obverse", "reverse", "handhold"];
  const result = { ...data };

  for (const field of imageFields) {
    const value = result[field];
    if (typeof value === "string" && value.length > 100) {
      // Likely a base64 image (short strings are IDs, not images)
      result[field] = await compressImage(value);
    }
  }

  return result;
}
