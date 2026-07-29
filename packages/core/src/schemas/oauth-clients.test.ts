import { describe, expect, test } from "vitest";
import { oauthClientSchemas } from "./oauth-clients";

const client = {
	name: "OAuth application",
	authMethod: "none" as const,
	redirectUris: ["http://localhost:5173/callback"],
};

describe("OAuth client schemas", () => {
	test.each([
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://[::1]:5173",
	])("accepts a loopback HTTP application website", (clientUri) => {
		expect(
			oauthClientSchemas.createSingle.body.safeParse({
				...client,
				clientUri,
			}).success,
		).toBe(true);
	});

	test("requires HTTPS for a non-loopback application website", () => {
		expect(
			oauthClientSchemas.createSingle.body.safeParse({
				...client,
				clientUri: "http://example.com",
			}).success,
		).toBe(false);
	});
});
