import { expect, test, vi } from "vitest";
import z from "zod";
import checkToolDefinitions from "../config/checks/check-tool-definitions.js";
import processConfig from "../config/process-config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import defineSkill from "../skills/define-skill.js";
import defineTool from "./define-tool.js";
import { getToolRegistry } from "./registry.js";

const adapter = {
	connect: vi.fn(),
	inferSchema: vi.fn(),
	dropAllTables: vi.fn(),
} as unknown as DatabaseAdapter;

const echo = defineTool({
	target: "mcp",
	name: "test_echo",
	description: "Echoes text",
	input: z.object({ message: z.string() }),
	output: z.object({ message: z.string() }),
	scopes: [],
	handler: async ({ input }) => ({
		error: undefined,
		data: {
			output: input,
		},
	}),
});
const pluginTool = defineTool({
	target: "mcp",
	name: "plugin_dummy",
	description: "Returns a dummy value",
	input: z.object({}),
	output: z.object({ ok: z.boolean() }),
	scopes: [],
	handler: async () => ({
		error: undefined,
		data: {
			output: { ok: true },
		},
	}),
});

test("normalizes shorthand and applies plugin registration before disabling tools", async () => {
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: {
				mcp: true,
				tools: { definitions: [echo], disabled: ["plugin_dummy"] },
			},
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					configure: (draft) => {
						draft.ai.tools.definitions.push(pluginTool);
					},
				},
			],
		},
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.ai.mcp).toEqual({ enabled: true });
	const names = [...getToolRegistry(config, "mcp").keys()];
	expect(names).toContain("test_echo");
	expect(names).not.toContain("plugin_dummy");
});

test("ai boolean shorthand keeps the remaining AI defaults", async () => {
	const config = await processConfig(
		{ secrets: "a".repeat(64), ai: false },
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.ai).toMatchObject({
		enabled: false,
		features: { imageGeneration: true },
		mcp: { enabled: false },
		tools: { disabled: [] },
	});
});

test("rejects duplicate tools and unknown disable entries", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { tools: { definitions: [echo, echo] } },
			},
			options,
		),
	).rejects.toThrow('Tool "test_echo" is registered more than once.');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { tools: { disabled: ["typo"] } },
			},
			options,
		),
	).rejects.toThrow('Disabled tool "typo" is not registered.');
});

const agentEcho = defineTool({
	target: "agent",
	name: "test_echo",
	description: "Agent echo",
	input: z.object({}),
	output: z.object({}),
	permissions: [],
	readOnly: true,
	handler: async () => ({ error: undefined, data: { output: {} } }),
});

test("separate targets can reuse a name and disabling it disables both", async () => {
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: { tools: { definitions: [echo, agentEcho] } },
		},
		{ resolvedDb: adapter },
	);
	expect(getToolRegistry(config, "agent").get("test_echo")).toEqual(agentEcho);
	expect(getToolRegistry(config, "mcp").get("test_echo")).toEqual(echo);

	const disabled = {
		...config,
		ai: {
			...config.ai,
			tools: { ...config.ai.tools, disabled: ["test_echo"] },
		},
	};
	expect(getToolRegistry(disabled, "agent").has("test_echo")).toBe(false);
	expect(getToolRegistry(disabled, "mcp").has("test_echo")).toBe(false);
});

test("the provider limit includes ask, history, finish and the optional skill loader", async () => {
	const base = await processConfig(
		{ secrets: "a".repeat(64) },
		{ resolvedDb: adapter },
	);
	const tools = Array.from({ length: 61 }, (_, i) => ({
		...agentEcho,
		name: `test_${i}`,
	}));
	const skill = defineSkill({
		target: "agent",
		name: "test-skill",
		description: "Test",
		instructions: "Test",
		scopes: [],
	});
	const config = {
		...base,
		ai: {
			...base.ai,
			tools: { definitions: tools, disabled: [] },
			skills: { definitions: [skill], disabled: [] },
		},
	};

	expect(() => checkToolDefinitions(config)).toThrow("60 custom agent tools");
	expect(() =>
		checkToolDefinitions({
			...config,
			ai: { ...config.ai, tools: { ...config.ai.tools, disabled: ["test_0"] } },
		}),
	).not.toThrow();
	expect(() =>
		checkToolDefinitions({
			...config,
			ai: {
				...config.ai,
				skills: { ...config.ai.skills, disabled: ["test-skill"] },
			},
		}),
	).not.toThrow();
	expect(() =>
		checkToolDefinitions({
			...config,
			ai: {
				...config.ai,
				skills: { definitions: [], disabled: [] },
				tools: {
					definitions: [...tools, { ...agentEcho, name: "one_too_many" }],
					disabled: [],
				},
			},
		}),
	).toThrow("61 custom agent tools");
});
