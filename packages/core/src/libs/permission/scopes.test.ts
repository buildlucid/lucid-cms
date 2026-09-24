import { describe, expect, test } from "vitest";
import { ExternalScopes } from "./external-scopes.js";
import { getInvalidExternalScopes, getValidExternalScopes } from "./scopes.js";

describe("external scopes", () => {
	test("makes account access available only to user principals", () => {
		expect(
			getValidExternalScopes(
				{ collections: [], access: [], mcp: { enabled: false } },
				{ principalType: "user" },
			),
		).toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes(
				{ collections: [], access: [], mcp: { enabled: false } },
				{ principalType: "system" },
			),
		).not.toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				mcp: { enabled: false },
			}),
		).toContain(ExternalScopes.AccountRead);
	});

	test("rejects account access for system integrations", () => {
		expect(
			getInvalidExternalScopes(
				{ collections: [], access: [], mcp: { enabled: false } },
				[ExternalScopes.AccountRead],
				{
					principalType: "system",
				},
			),
		).toEqual([ExternalScopes.AccountRead]);
		expect(
			getInvalidExternalScopes(
				{ collections: [], access: [], mcp: { enabled: false } },
				[ExternalScopes.AccountRead],
				{
					principalType: "user",
				},
			),
		).toEqual([]);
	});

	test("offers MCP access only when MCP is enabled", () => {
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				mcp: { enabled: true },
			}),
		).toContain(ExternalScopes.McpAccess);
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				mcp: { enabled: false },
			}),
		).not.toContain(ExternalScopes.McpAccess);
	});
});
