import { describe, expect, test } from "vitest";
import { ExternalScopes } from "./external-scopes.js";
import { getInvalidExternalScopes, getValidExternalScopes } from "./scopes.js";

const aiConfig = (mcp: boolean) => ({
	enabled: true,
	features: {
		imageGeneration: true,
		altGeneration: true,
		customFieldGeneration: true,
		agents: true,
		mcp,
	},
	agents: [],
});

describe("external scopes", () => {
	test("makes account access available only to user principals", () => {
		expect(
			getValidExternalScopes(
				{
					collections: [],
					access: [],
					ai: aiConfig(false),
				},
				{ principalType: "user" },
			),
		).toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes(
				{
					collections: [],
					access: [],
					ai: aiConfig(false),
				},
				{ principalType: "system" },
			),
		).not.toContain(ExternalScopes.AccountRead);
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				ai: aiConfig(false),
			}),
		).toContain(ExternalScopes.AccountRead);
	});

	test("rejects account access for system integrations", () => {
		expect(
			getInvalidExternalScopes(
				{
					collections: [],
					access: [],
					ai: aiConfig(false),
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
					ai: aiConfig(false),
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
				ai: aiConfig(true),
			}),
		).toContain(ExternalScopes.McpAccess);
		expect(
			getValidExternalScopes({
				collections: [],
				access: [],
				ai: aiConfig(false),
			}),
		).not.toContain(ExternalScopes.McpAccess);
	});
});
