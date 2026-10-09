import { expect, test, vi } from "vitest";
import z from "zod";
import defineAgent from "../agent/define-agent.js";
import checkToolDefinitions from "../config/checks/check-tool-definitions.js";
import processConfig from "../config/process-config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import defineAgentTool from "./define-agent-tool.js";
import defineMcpTool from "./define-mcp-tool.js";
import { agentTools, mcpTools } from "./lucid-tools.js";
import { getMcpToolRegistry } from "./registry.js";
import type { AgentToolDefinition } from "./types.js";

const adapter = {
	connect: vi.fn(),
	inferSchema: vi.fn(),
	dropAllTables: vi.fn(),
} as unknown as DatabaseAdapter;

const echo = defineMcpTool({
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
const pluginTool = defineMcpTool({
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
const agentEcho = defineAgentTool({
	name: "test_echo",
	description: "Agent echo",
	input: z.object({}),
	output: z.object({}),
	permissions: [],
	readOnly: true,
	handler: async () => ({
		error: undefined,
		data: { output: {}, summary: "Completed the test action." },
	}),
});
const agent = (key: string, tools: AgentToolDefinition[] = [agentEcho]) =>
	defineAgent({ key, name: "Test", description: "Test", tools });

test("plugins can add MCP tools and agents while configuring", async () => {
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: {
				features: { mcp: true },
				mcp: { tools: [echo] },
				agents: { definitions: [agent("configured")] },
			},
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					configure: (draft) => {
						draft.ai.mcp.tools.push(pluginTool);
						draft.ai.agents.definitions.push(agent("plugin"));
					},
				},
			],
		},
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.ai.features.mcp).toBe(true);
	expect([...getMcpToolRegistry(config).keys()]).toEqual([
		"plugin_dummy",
		"test_echo",
	]);
	expect(config.ai.agents.definitions.map((agent) => agent.key)).toEqual([
		"configured",
		"plugin",
	]);
});

test("ai boolean shorthand keeps the remaining AI defaults", async () => {
	const config = await processConfig(
		{ secrets: "a".repeat(64), ai: false },
		{ resolvedDb: adapter, skipValidation: true },
	);
	expect(config.ai).toMatchObject({
		enabled: false,
		features: { imageGeneration: true },
		mcp: { tools: [], skills: [] },
		agents: { definitions: [] },
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
	).rejects.toThrow('Agent "test" tools must be created with defineAgentTool.');

	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: { mcp: { tools: [echo] }, agents: [agent("one"), agent("two")] },
		},
		options,
	);
	expect(getMcpToolRegistry(config).get("test_echo")).toEqual(echo);
	expect(config.ai.agents.definitions[1]?.tools).toContainEqual(agentEcho);
});

test("a tool name can only be registered once in each placement", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: {
					mcp: {
						tools: [mcpTools.listCollections(), mcpTools.listCollections()],
					},
				},
			},
			options,
		),
	).rejects.toThrow('MCP registers tool "collections_list" more than once.');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: {
					agents: [
						agent("test", [
							agentTools.listCollections(),
							agentTools.listCollections(),
						]),
					],
				},
			},
			options,
		),
	).rejects.toThrow(
		'Agent "test" registers tool "collections_list" more than once.',
	);
});

test("interaction keys cannot use the prefix reserved for Lucid's own widgets, except a core tool's own key", async () => {
	const base = await processConfig(
		{ secrets: "a".repeat(64) },
		{ resolvedDb: adapter },
	);
	const picker = (key: string) =>
		defineAgentTool({
			name: "test_picker",
			description: "Picks",
			input: z.object({}),
			output: z.object({}),
			permissions: [],
			readOnly: true,
			interaction: {
				key,
				version: 1,
				data: z.object({}),
				response: () => z.object({}),
				prepare: async () => ({
					error: undefined,
					data: { output: {}, summary: "No selection was needed." },
				}),
			},
			handler: async () => ({
				error: undefined,
				data: { output: {}, summary: "Completed the test action." },
			}),
		});
	const check = (tool: AgentToolDefinition) => () =>
		checkToolDefinitions({
			...base,
			ai: {
				...base.ai,
				agents: { definitions: [agent("test", [tool])] },
			},
		});

	expect(check(picker("lucid-question"))).toThrow(
		'Agent tool "test_picker" needs an interaction key',
	);
	expect(check(picker("lucid-media-select"))).toThrow(
		'Agent tool "test_picker" needs an interaction key',
	);
	expect(check(picker("test-picker"))).not.toThrow();
	expect(check(agentTools.selectMedia())).not.toThrow();
});
