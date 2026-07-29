import { describe, expect, test } from "vitest";
import { decodeApiKey, encodeApiKey } from "./encode-api-key";

describe("API Key Encoding/Decoding", () => {
	test("should correctly encode the integration key and API secret", () => {
		const key = "client_abc123";
		const apiKey = "def456ghi789";

		const encoded = encodeApiKey(key, apiKey);

		expect(encoded).toBe("lucid_int_Y2xpZW50X2FiYzEyMzpkZWY0NTZnaGk3ODk");
		expect(typeof encoded).toBe("string");
	});

	test("should correctly decode encoded api key", () => {
		const encoded = "lucid_int_Y2xpZW50X2FiYzEyMzpkZWY0NTZnaGk3ODk";

		const result = decodeApiKey(encoded);

		expect(result.key).toBe("client_abc123");
		expect(result.apiKey).toBe("def456ghi789");
	});

	test("should handle round-trip encoding and decoding", () => {
		const originalKey = "client_test_123";
		const originalApiKey = "secret_api_key_456";

		const encoded = encodeApiKey(originalKey, originalApiKey);
		const decoded = decodeApiKey(encoded);

		expect(decoded.key).toBe(originalKey);
		expect(decoded.apiKey).toBe(originalApiKey);
	});

	test("should reject credentials without the integration prefix", () => {
		const decoded = decodeApiKey("Y2xpZW50X2FiYzEyMzpkZWY0NTZnaGk3ODk");

		expect(decoded.key).toBeUndefined();
		expect(decoded.apiKey).toBeUndefined();
	});
});
