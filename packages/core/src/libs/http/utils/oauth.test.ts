import { describe, expect, test } from "vitest";
import { parseOAuthClientCredentials, uniqueOAuthParameters } from "./oauth";

describe("OAuth HTTP utilities", () => {
	test("accepts a public client ID from the request body", () => {
		expect(parseOAuthClientCredentials(undefined, "public-client")).toEqual({
			clientId: "public-client",
		});
	});

	test("accepts confidential client credentials through HTTP Basic", () => {
		const authorization = `Basic ${Buffer.from(
			"confidential-client:client-secret",
		).toString("base64")}`;

		expect(
			parseOAuthClientCredentials(authorization, "confidential-client"),
		).toEqual({
			clientId: "confidential-client",
			clientSecret: "client-secret",
		});
	});

	test("rejects ambiguous or malformed client credentials", () => {
		const authorization = `Basic ${Buffer.from(
			"confidential-client:client-secret",
		).toString("base64")}`;

		expect(
			parseOAuthClientCredentials(authorization, "different-client"),
		).toBeUndefined();
		expect(
			parseOAuthClientCredentials("Bearer access-token", undefined),
		).toBeUndefined();
		expect(
			parseOAuthClientCredentials(
				`Basic ${Buffer.from("client-without-secret:").toString("base64")}`,
				undefined,
			),
		).toBeUndefined();
	});

	test("rejects duplicate OAuth parameters", () => {
		const parameters = new URLSearchParams([
			["client_id", "one"],
			["client_id", "two"],
		]);

		expect(uniqueOAuthParameters(parameters)).toBeUndefined();
	});
});
