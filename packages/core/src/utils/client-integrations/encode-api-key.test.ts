import { describe, test, expect } from "vitest";
import { encodeApiKey, decodeApiKey } from "./encode-api-key";

describe("API Key Encoding/Decoding", () => {
	test("should correctly encode client key and api secret", () => {
		const key = "client_abc123";
		const apiKey = "def456ghi789";

		const encoded = encodeApiKey(key, apiKey);

		expect(encoded).toBe("Y2xpZW50X2FiYzEyMzpkZWY0NTZnaGk3ODk=");
		expect(typeof encoded).toBe("string");
	});

	test("should correctly decode encoded api key", () => {
		const encoded = "Y2xpZW50X2FiYzEyMzpkZWY0NTZnaGk3ODk=";

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
});
