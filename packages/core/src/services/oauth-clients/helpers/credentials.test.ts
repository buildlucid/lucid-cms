import { describe, expect, test } from "vitest";
import testingConstants from "../../../constants/testing-constants";
import {
	createOAuthClientId,
	createOAuthClientSecret,
	oauthClientIdPrefix,
	oauthClientSecretPrefix,
	verifyOAuthClientSecret,
} from "./credentials";

describe("OAuth client credentials", () => {
	test("creates an opaque, header-safe client ID", () => {
		const clientId = createOAuthClientId();

		expect(clientId).toMatch(/^lucid_oauth_[A-Za-z0-9_-]{16}$/);
		expect(clientId.startsWith(oauthClientIdPrefix)).toBe(true);
	});

	test("stores a confidential client secret as a salted hash", async () => {
		const credential = createOAuthClientSecret(testingConstants.key);

		expect(credential.clientSecret).toMatch(
			/^lucid_oauth_secret_[A-Za-z0-9_-]{43}$/,
		);
		expect(credential.clientSecret.startsWith(oauthClientSecretPrefix)).toBe(
			true,
		);
		expect(credential.clientSecretHash).not.toContain(credential.clientSecret);
		expect(credential.clientSecretSalt).not.toContain(credential.clientSecret);

		const valid = await verifyOAuthClientSecret(
			credential.clientSecret,
			credential.clientSecretHash,
			credential.clientSecretSalt,
			testingConstants.key,
		);
		expect(valid).toEqual({
			error: undefined,
			data: true,
		});

		const invalid = await verifyOAuthClientSecret(
			"different-secret",
			credential.clientSecretHash,
			credential.clientSecretSalt,
			testingConstants.key,
		);
		expect(invalid.error?.code).toBe("invalid_client");
	});
});
