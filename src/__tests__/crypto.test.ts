import { describe, it, expect } from "vitest";
import { encrypt, decrypt, rsaEncrypt, randomStr, generateNonce } from "../crypto.js";

describe("crypto", () => {
  describe("encrypt / decrypt", () => {
    it("加密后解密应还原原文", () => {
      const message = '{"user_email":"test@example.com","password":"123456"}';
      const secretKey = "VbI1OP9FooZWudxCiqj735mBl3hPrzk8"; // 32 chars
      const iv = "63VpAoZX3QiW5LR3"; // 16 chars

      const encrypted = encrypt(message, secretKey, iv);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(message);

      const decrypted = decrypt(encrypted, secretKey, iv);
      expect(decrypted).toBe(message);
    });

    it("使用数字 nonce 作为 IV 应正常工作", () => {
      const message = '{"card_id":"abc123"}';
      const secretKey = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef"; // 32 chars
      const nonce = 1710000000000000; // 16 digits like generateNonce()

      const encrypted = encrypt(message, secretKey, nonce);
      expect(encrypted).toBeTruthy();

      const decrypted = decrypt(encrypted, secretKey, nonce);
      expect(decrypted).toBe(message);
    });

    it("不同密钥解密应失败", () => {
      const message = "hello world";
      const key1 = "VbI1OP9FooZWudxCiqj735mBl3hPrzk8";
      const key2 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
      const iv = "63VpAoZX3QiW5LR3";

      const encrypted = encrypt(message, key1, iv);
      const decrypted = decrypt(encrypted, key2, iv);
      // 错误密钥解密通常返回空字符串或乱码
      expect(decrypted).not.toBe(message);
    });

    it("加密输出应为 Base64 格式", () => {
      const encrypted = encrypt("test", "VbI1OP9FooZWudxCiqj735mBl3hPrzk8", "63VpAoZX3QiW5LR3");
      // Base64 字符集
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("空字符串加密解密", () => {
      const secretKey = "VbI1OP9FooZWudxCiqj735mBl3hPrzk8";
      const iv = "63VpAoZX3QiW5LR3";
      const encrypted = encrypt("", secretKey, iv);
      const decrypted = decrypt(encrypted, secretKey, iv);
      expect(decrypted).toBe("");
    });

    it("中文内容加密解密", () => {
      const message = '{"name":"张三","address":"北京市"}';
      const secretKey = "VbI1OP9FooZWudxCiqj735mBl3hPrzk8";
      const iv = "63VpAoZX3QiW5LR3";
      const encrypted = encrypt(message, secretKey, iv);
      const decrypted = decrypt(encrypted, secretKey, iv);
      expect(decrypted).toBe(message);
    });

    it("与前端 baseUtils.js 使用相同默认密钥时应一致", () => {
      // 前端默认密钥和IV
      const defaultKey = "VbI1OP9FooZWudxCiqj735mBl3hPrzk8";
      const defaultIv = "63VpAoZX3QiW5LR3";
      const message = "test message";

      const encrypted = encrypt(message, defaultKey, defaultIv);
      // 使用相同参数解密应成功
      const decrypted = decrypt(encrypted, defaultKey, defaultIv);
      expect(decrypted).toBe(message);
    });
  });

  describe("rsaEncrypt", () => {
    it("应成功加密数据", () => {
      const data = "test-secret-key-12345678901234";
      const result = rsaEncrypt(data);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("加密结果应为 Base64 格式", () => {
      const result = rsaEncrypt("hello");
      expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it("相同数据两次加密结果应不同（RSA PKCS1 填充有随机性）", () => {
      const data = "same-data-twice";
      const result1 = rsaEncrypt(data);
      const result2 = rsaEncrypt(data);
      expect(result1).not.toBe(result2);
    });

    it("应能加密 32 字符的 secretKey", () => {
      const secretKey = randomStr(32);
      const result = rsaEncrypt(secretKey);
      expect(result).toBeTruthy();
      // RSA-2048 with PKCS1 padding, base64 output should be ~344 chars
      expect(result.length).toBeGreaterThan(100);
    });
  });

  describe("randomStr", () => {
    it("默认生成 32 字符", () => {
      const result = randomStr();
      expect(result).toHaveLength(32);
    });

    it("生成指定长度", () => {
      expect(randomStr(16)).toHaveLength(16);
      expect(randomStr(64)).toHaveLength(64);
      expect(randomStr(1)).toHaveLength(1);
    });

    it("仅包含大小写字母和数字", () => {
      const result = randomStr(1000);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("两次生成应不同（概率测试）", () => {
      const results = new Set(Array.from({ length: 10 }, () => randomStr()));
      expect(results.size).toBe(10);
    });

    it("应包含多样化的字符（熵测试）", () => {
      const result = randomStr(100);
      const uniqueChars = new Set(result.split(""));
      // 100个随机字符中，不同字符数应该不少于20种
      expect(uniqueChars.size).toBeGreaterThan(20);
    });
  });

  describe("generateNonce", () => {
    it("应返回一个正整数", () => {
      const nonce = generateNonce();
      expect(nonce).toBeGreaterThan(0);
      expect(Number.isInteger(nonce)).toBe(true);
    });

    it("应为 16 位数字（当前时间戳范围）", () => {
      const nonce = generateNonce();
      const str = String(nonce);
      expect(str.length).toBe(16);
    });

    it("末尾应为 6 个零", () => {
      const nonce = generateNonce();
      expect(nonce % 1000000).toBe(0);
    });

    it("公式应为 floor(Date.now()/1000) * 1000000", () => {
      const before = Math.floor(Date.now() / 1000) * 1000000;
      const nonce = generateNonce();
      const after = Math.floor(Date.now() / 1000) * 1000000;
      expect(nonce).toBeGreaterThanOrEqual(before);
      expect(nonce).toBeLessThanOrEqual(after);
    });

    it("nonce 转字符串应可作为有效 AES IV", () => {
      const nonce = generateNonce();
      const ivStr = String(nonce);
      // 16字节 = AES block size
      expect(Buffer.byteLength(ivStr, "utf8")).toBe(16);
    });
  });
});
