import { expect, test, vi } from "vitest";
import z from "zod";
import processConfig from "../config/process-config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import defineTool from "./define-tool.js";
import { getToolRegistry } from "./registry.js";

const adapter = {
	connect: vi.fn(),
	inferSchema: vi.fn(),
	dropAllTables: vi.fn(),
} as unknown as DatabaseAdapter;

const echo = defineTool({
	name: "test_echo",
	description: "Echoes text",
	input: z.object({ message: z.string() }),
	output: z.object({ message: z.string() }),
	scopes: [],
	handler: async ({ input }) => ({ error: undefined, data: input }),
});
const pluginTool = defineTool({
	name: "plugin_dummy",
	description: "Returns a dummy value",
	input: z.object({}),
	output: z.object({ ok: z.boolean() }),
	scopes: [],
	handler: async () => ({ error: undefined, data: { ok: true } }),
});

test("normalizes shorthand and applies plugin registration before disabling tools", async () => {
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			mcp: true,
			tools: { definitions: [echo], disabled: ["plugin_dummy"] },
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					configure: (draft) => {
						draft.tools.definitions.push(pluginTool);
					},
				},
			],
		},
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.mcp).toEqual({ enabled: true });
	expect([...getToolRegistry(config).keys()]).toEqual(["test_echo"]);
});

test("rejects duplicate tools and unknown disable entries", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				tools: { definitions: [echo, echo] },
			},
			options,
		),
	).rejects.toThrow('Tool "test_echo" is registered more than once.');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				tools: { disabled: ["typo"] },
			},
			options,
		),
	).rejects.toThrow('Disabled tool "typo" is not registered.');
});
