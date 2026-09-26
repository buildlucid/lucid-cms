import { expect, test, vi } from "vitest";
import z from "zod";
import defineAgent from "../agent/define-agent.js";
import checkToolDefinitions from "../config/checks/check-tool-definitions.js";
import processConfig from "../config/process-config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import defineSkill from "../skills/define-skill.js";
import { getCoreAgentTools, getCoreMcpTools } from "./core-tools.js";
import defineTool from "./define-tool.js";
import { getMcpToolRegistry } from "./registry.js";
import type { AgentToolDefinition } from "./types.js";

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
const agent = (key: string, tools: AgentToolDefinition[] = [agentEcho]) =>
	defineAgent({ key, name: "Test", description: "Test", tools });

test("plugins can add MCP tools and agents while configuring", async () => {
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: { mcp: { tools: [echo] } },
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					configure: (draft) => {
						draft.ai.mcp.tools.push(pluginTool);
						draft.ai.agents.push(agent("plugin"));
					},
				},
			],
		},
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.ai.mcp.enabled).toBe(true);
	expect([...getMcpToolRegistry(config).keys()]).toEqual(
		[
			...getCoreMcpTools().map((tool) => tool.name),
			"plugin_dummy",
			"test_echo",
		].sort(),
	);
	expect(config.ai.agents.map((agent) => agent.key)).toEqual(["plugin"]);
});

test("ai boolean shorthand keeps the remaining AI defaults", async () => {
	const config = await processConfig(
		{ secrets: "a".repeat(64), ai: false },
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.ai).toMatchObject({
		enabled: false,
		features: { imageGeneration: true },
		mcp: { enabled: false, tools: [], skills: [] },
		agents: [],
	});
});

test("names are unique within a placement, which only holds its own target", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{ secrets: "a".repeat(64), ai: { mcp: { tools: [echo, echo] } } },
			options,
		),
	).rejects.toThrow('MCP registers tool "test_echo" more than once.');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: {
					agents: [
						// @ts-expect-error agents only accept agent tools
						defineAgent({ ...agent("test"), tools: [echo] }),
					],
				},
			},
			options,
		),
	).rejects.toThrow(
		'Agent "test" tools must be created with defineTool and target "agent".',
	);

	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: { mcp: { tools: [echo] }, agents: [agent("one"), agent("two")] },
		},
		options,
	);
	expect(getMcpToolRegistry(config).get("test_echo")).toEqual(echo);
	expect(config.ai.agents[1]?.tools).toEqual([agentEcho]);
});

test("content tool names are reserved in each placement", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { mcp: { tools: [...getCoreMcpTools().slice(0, 1)] } },
			},
			options,
		),
	).rejects.toThrow('MCP registers tool "collections_list" more than once.');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { agents: [agent("test", [...getCoreAgentTools().slice(0, 1)])] },
			},
			options,
		),
	).rejects.toThrow(
		'Agent "test" registers tool "collections_list" more than once.',
	);
});

test("each agent's provider limit includes content and runner tools", async () => {
	const base = await processConfig(
		{ secrets: "a".repeat(64) },
		{ resolvedDb: adapter },
	);
	const tools = Array.from({ length: 55 }, (_, i) => ({
		...agentEcho,
		name: `test_${i}`,
	}));
	const skill = defineSkill({
		name: "test-skill",
		description: "Test",
		instructions: "Test",
		scopes: [],
	});
	const withAgent = (definition: ReturnType<typeof agent>) => ({
		...base,
		ai: { ...base.ai, agents: [definition] },
	});

	expect(() =>
		checkToolDefinitions(
			withAgent(defineAgent({ ...agent("test", tools), skills: [skill] })),
		),
	).toThrow('Agent "test" can have at most 54 additional tools');
	expect(() =>
		checkToolDefinitions(withAgent(agent("test", tools))),
	).not.toThrow();
	expect(() =>
		checkToolDefinitions(
			withAgent(
				agent("test", [...tools, { ...agentEcho, name: "one_too_many" }]),
			),
		),
	).toThrow('Agent "test" can have at most 55 additional tools');
});
