import { describe, expect, test } from "vitest";
import { ExternalScopes } from "./external-scopes.js";
import { getInvalidExternalScopes, getValidExternalScopes } from "./scopes.js";

describe("external scopes", () => {
	test("makes account access available only to user principals", () => {
		expect(
			getValidExternalScopes(
				{ collections: [], access: [] },
				{ principalType: "user" },
			),
		).toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes(
				{ collections: [], access: [] },
				{ principalType: "system" },
			),
		).not.toContain(ExternalScopes.AccountRead);
		expect(getValidExternalScopes({ collections: [], access: [] })).toContain(
			ExternalScopes.AccountRead,
		);
	});

	test("rejects account access for system integrations", () => {
		expect(
			getInvalidExternalScopes(
				{ collections: [], access: [] },
				[ExternalScopes.AccountRead],
				{
					principalType: "system",
				},
			),
		).toEqual([ExternalScopes.AccountRead]);
		expect(
			getInvalidExternalScopes(
				{ collections: [], access: [] },
				[ExternalScopes.AccountRead],
				{
					principalType: "user",
				},
			),
		).toEqual([]);
	});
});
