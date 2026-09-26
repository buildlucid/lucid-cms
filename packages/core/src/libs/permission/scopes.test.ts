import { describe, expect, test } from "vitest";
import { ExternalScopes } from "./external-scopes.js";
import { getInvalidExternalScopes, getValidExternalScopes } from "./scopes.js";

describe("external scopes", () => {
	test("makes account access available only to user principals", () => {
		expect(
			getValidExternalScopes(
				{
					collections: [],
					access: [],
					ai: { enabled: true, mcp: { enabled: false }, agents: [] },
				},
				{ principalType: "user" },
			),
		).toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes(
				{
					collections: [],
					access: [],
					ai: { enabled: true, mcp: { enabled: false }, agents: [] },
				},
				{ principalType: "system" },
			),
		).not.toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				ai: { enabled: true, mcp: { enabled: false }, agents: [] },
			}),
		).toContain(ExternalScopes.AccountRead);
	});

	test("rejects account access for system integrations", () => {
		expect(
			getInvalidExternalScopes(
				{
					collections: [],
					access: [],
					ai: { enabled: true, mcp: { enabled: false }, agents: [] },
				},
				[ExternalScopes.AccountRead],
				{
					principalType: "system",
				},
			),
		).toEqual([ExternalScopes.AccountRead]);
		expect(
			getInvalidExternalScopes(
				{
					collections: [],
					access: [],
					ai: { enabled: true, mcp: { enabled: false }, agents: [] },
				},
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
				ai: { enabled: true, mcp: { enabled: true }, agents: [] },
			}),
		).toContain(ExternalScopes.McpAccess);
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				ai: { enabled: true, mcp: { enabled: false }, agents: [] },
			}),
		).not.toContain(ExternalScopes.McpAccess);
	});
});
