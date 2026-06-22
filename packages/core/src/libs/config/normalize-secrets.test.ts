import { expect, test } from "vitest";
import normalizeSecrets from "./normalize-secrets.js";

test("derives stable internal secrets from a root secret", () => {
	const rootSecret = "a".repeat(64);
	const secrets = normalizeSecrets(rootSecret);

	expect(secrets).toEqual(normalizeSecrets(rootSecret));
	expect(Object.values(secrets)).toHaveLength(4);
	expect(new Set(Object.values(secrets)).size).toBe(4);
	for (const secret of Object.values(secrets)) {
		expect(secret).toHaveLength(64);
	}
});

test("passes expanded secret config through unchanged", () => {
	const secrets = {
		encryption: "a".repeat(64),
		cookie: "b".repeat(64),
		accessToken: "c".repeat(64),
		refreshToken: "d".repeat(64),
	};

	expect(normalizeSecrets(secrets)).toBe(secrets);
});

test("rejects short root secrets", () => {
	expect(() => normalizeSecrets("short")).toThrow(
		"Lucid root secret must be 64 characters long.",
	);
});
