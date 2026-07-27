import { describe, expect, test } from "vitest";
import testingConstants from "../../constants/testing-constants.js";
import { decrypt, encrypt } from "./encrypt-decrypt.js";

describe("authenticated secret encryption", () => {
	test("round-trips with a versioned AES-256-GCM envelope", () => {
		const plaintext = "client-secret-with-unicode-✓";
		const ciphertext = encrypt(plaintext, testingConstants.key);

		expect(ciphertext.startsWith("v1.")).toBe(true);
		expect(ciphertext).not.toContain(plaintext);
		expect(decrypt(ciphertext, testingConstants.key)).toBe(plaintext);
	});

	test("detects ciphertext, nonce, and authentication-tag tampering", () => {
		const ciphertext = encrypt("refresh-token", testingConstants.key);
		const parts = ciphertext.split(".");

		for (const index of [1, 2, 3]) {
			const tampered = [...parts];
			const part = tampered[index] as string;
			tampered[index] = `${part.startsWith("A") ? "B" : "A"}${part.slice(1)}`;

			expect(() => decrypt(tampered.join("."), testingConstants.key)).toThrow();
		}
	});

	test("rejects the wrong key and legacy AES-CBC-shaped values", () => {
		const ciphertext = encrypt("client-id", testingConstants.key);

		expect(() => decrypt(ciphertext, "x".repeat(64))).toThrow();
		expect(() =>
			decrypt("0123456789abcdef:deadbeef", testingConstants.key),
		).toThrow();
	});
});
