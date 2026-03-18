/**
 * Chinese-to-Pinyin conversion utility.
 *
 * Uses pinyin-pro for accurate polyphonic character handling.
 * Example: "重庆市南岸区弹子石" → "Chongqing Shi Nan An Qu Dan Zi Shi"
 *   - "重" is read as "Chong" (not "Zhong") in "重庆"
 *   - "弹" is read as "Dan" (not "Tan") in "弹子石"
 */

import { pinyin, customPinyin } from "pinyin-pro";

// Register custom pinyin for known polyphonic place names / words
// that pinyin-pro may get wrong by default.
customPinyin({
  弹子石: "dàn zǐ shí",
  // Add more polyphonic corrections as needed:
  // 单县: "shàn xiàn",
  // 六安: "lù ān",
  // 柏林: "bó lín",
});

/**
 * Check if a string contains Chinese characters.
 */
export function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fff]/.test(str);
}

/**
 * Convert a Chinese name to Pinyin, capitalizing appropriately.
 * Handles common Chinese name formats:
 *   "张善林"     → "Zhang Shanlin"  (surname + given name)
 *   "Zhang Shanlin" → "Zhang Shanlin" (already English, capitalize)
 *
 * For first/last name separately:
 *   firstName="善林" → "Shanlin"
 *   lastName="张" → "Zhang"
 */
export function nameToPinyin(text: string): string {
  if (!text) return text;
  if (!containsChinese(text)) {
    // Already English — capitalize each word
    return text
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  const chars = text.replace(/\s+/g, "");
  const pinyinArr = pinyin(chars, {
    toneType: "none",
    type: "array",
    v: true,
  });

  if (pinyinArr.length === 0) return text;

  // Join all syllables and capitalize first letter
  const joined = pinyinArr.join("");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/**
 * Convert Chinese address to Pinyin with each word capitalized.
 * "重庆市南岸区弹子石" → "Chongqing Shi Nan An Qu Dan Zi Shi"
 */
export function addressToPinyin(text: string): string {
  if (!text || !containsChinese(text)) return text;

  const result = pinyin(text, {
    toneType: "none",
    type: "string",
    separator: " ",
    v: true,
  });

  // Capitalize each word
  return result
    .split(" ")
    .filter((w: string) => w.length > 0)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Auto-convert Chinese fields in a KYC data object to Pinyin.
 * Detects Chinese content and converts:
 *   - Name fields → nameToPinyin
 *   - Address fields → addressToPinyin
 *   - Other string fields → addressToPinyin (safe default)
 */
export function autoConvertKycFields(
  data: Record<string, any>
): Record<string, any> {
  const nameFields = [
    "firstName",
    "midName",
    "lastName",
    "issueBy",
  ];
  const addressFields = [
    "adrLine1",
    "adrLine2",
    "city",
    "state",
    "nationality",
  ];

  const result = { ...data };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== "string" || !containsChinese(value)) continue;

    if (nameFields.includes(key)) {
      result[key] = nameToPinyin(value);
    } else if (addressFields.includes(key)) {
      result[key] = addressToPinyin(value);
    } else {
      // Default: address-style conversion for any other Chinese string
      result[key] = addressToPinyin(value);
    }
  }

  return result;
}
