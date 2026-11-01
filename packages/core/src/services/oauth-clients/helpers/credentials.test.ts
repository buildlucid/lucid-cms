import { describe, expect, test } from "vitest";
import testingConstants from "../../../constants/testing-constants";
import type { ServiceContext } from "../../../utils/services/types";
import {
	createOAuthClientId,
	createOAuthClientSecret,
	oauthClientIdPrefix,
	oauthClientSecretPrefix,
	verifyOAuthClientSecret,
} from "./credentials";

const contextWith = (encryption: string) =>
	({ config: { secrets: { encryption } } }) as unknown as ServiceContext;

describe("OAuth client credentials", () => {
	test("creates an opaque, header-safe client ID", () => {
		const clientId = createOAuthClientId();

		expect(clientId).toMatch(/^lucid_oauth_[A-Za-z0-9_-]{16}$/);
		expect(clientId.startsWith(oauthClientIdPrefix)).toBe(true);
	});

	test("stores a confidential client secret as a keyed hash", () => {
		const context = contextWith(testingConstants.key);
		const credential = createOAuthClientSecret(context);

		expect(credential.clientSecret).toMatch(
			/^lucid_oauth_secret_[A-Za-z0-9_-]{43}$/,
		);
		expect(credential.clientSecret.startsWith(oauthClientSecretPrefix)).toBe(
			true,
		);
		expect(credential.clientSecretHash).not.toContain(credential.clientSecret);

		expect(
			verifyOAuthClientSecret(
				context,
				credential.clientSecret,
				credential.clientSecretHash,
			),
		).toBe(true);
		expect(
			verifyOAuthClientSecret(
				context,
				"different-secret",
				credential.clientSecretHash,
			),
		).toBe(false);
		expect(
			verifyOAuthClientSecret(
				contextWith("a".repeat(64)),
				credential.clientSecret,
				credential.clientSecretHash,
			),
		).toBe(false);
	});
});
