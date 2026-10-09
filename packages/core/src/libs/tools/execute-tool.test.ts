import { afterAll, beforeAll, expect, test, vi } from "vitest";
import z from "zod";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { copy, createTranslationStore } from "../i18n/index.js";
import { Permissions } from "../permission/definitions.js";
import { ExternalScopes } from "../permission/external-scopes.js";
import defineAgentTool from "./define-agent-tool.js";
import defineMcpTool from "./define-mcp-tool.js";
import {
	executeAgentTool,
	executeMcpTool,
	prepareAgentTool,
} from "./execute-tool.js";
import { toolDefinitionInternal } from "./registry.js";
import type { AgentToolAuthority } from "./types.js";

const testConfig = getTestConfig();
let context: ServiceContext;
const agentHandler = vi.fn(async () => ({
	error: undefined,
	data: { output: { source: "agent" }, summary: "Read the agent source." },
}));
const mcpHandler = vi.fn(async () => ({
	error: undefined,
	data: { output: { source: "mcp" } },
}));
const schema = z.object({});
const output = z.object({ source: z.string() });
const agentTool = defineAgentTool({
	name: "shared_name",
	description: "Agent write",
	input: schema,
	output,
	permissions: [Permissions.MediaRead],
	requiredPermissions: () => [Permissions.MediaUpdate],
	handler: agentHandler,
});
const mcpTool = defineMcpTool({
	name: "shared_name",
	description: "MCP read",
	input: schema,
	output,
	scopes: [ExternalScopes.MediaRead],
	handler: mcpHandler,
});

beforeAll(async () => {
	const config = await testConfig.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				features: { ...config.ai.features, mcp: true },
				mcp: { tools: [mcpTool], skills: [] },
			},
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});
afterAll(testConfig.destroy);

const user = { type: "user", userId: 1 } as const;
const run = {
	id: "test-run",
	conversationId: "test-conversation",
	userId: 1,
	agentKey: "test-agent",
};
const runAgent = (authority: AgentToolAuthority) =>
	executeAgentTool({
		context,
		tool: agentTool,
		input: {},
		execution: {
			authority,
			actor: { kind: "user", userId: 1 },
			run,
			signal: AbortSignal.timeout(1000),
			operationId: "run:call",
		},
	});

test("agent execution checks both static and input-dependent permissions", async () => {
	expect(
		await runAgent({
			principal: user,
			permissions: [Permissions.MediaUpdate],
			superAdmin: false,
		}),
	).toEqual({ type: "forbidden" });
	expect(
		await runAgent({
			principal: user,
			permissions: [Permissions.MediaRead],
			superAdmin: false,
		}),
	).toEqual({ type: "forbidden" });
	expect(agentHandler).not.toHaveBeenCalled();
	expect(
		await runAgent({
			principal: user,
			permissions: [Permissions.MediaRead, Permissions.MediaUpdate],
			superAdmin: false,
		}),
	).toMatchObject({
		type: "success",
		data: {
			output: { source: "agent" },
			summary: copy.literal("Read the agent source."),
		},
	});
	expect(agentHandler).toHaveBeenLastCalledWith(
		expect.objectContaining({
			execution: expect.objectContaining({ operationId: "run:call" }),
			toolkit: expect.objectContaining({ documents: expect.any(Object) }),
		}),
	);
	expect(
		await runAgent({ principal: user, permissions: [], superAdmin: true }),
	).toMatchObject({ type: "success" });
	expect(
		await runAgent({ principal: user, permissions: [], superAdmin: false }),
	).toEqual({ type: "forbidden" });
});

test("MCP resolves only its own tools and requires their scopes", async () => {
	const execution = {
		authority: {
			principal: { type: "system" as const },
			scopes: [ExternalScopes.MediaRead],
		},
		signal: AbortSignal.timeout(1000),
	};
	expect(
		await executeMcpTool({
			context,
			name: "shared_name",
			input: {},
			execution,
		}),
	).toMatchObject({ type: "success", data: { output: { source: "mcp" } } });
	expect(
		await executeMcpTool({ context, name: "missing", input: {}, execution }),
	).toEqual({ type: "not-found" });
	expect(
		await executeMcpTool({
			context,
			name: "shared_name",
			input: {},
			execution: {
				...execution,
				authority: { ...execution.authority, scopes: [] },
			},
		}),
	).toEqual({ type: "forbidden" });
	expect(mcpHandler).toHaveBeenCalledTimes(1);
});

test.each([
	copy("admin:test.source.read", {
		data: { source: "agent", count: 3 },
		defaultMessage: "Read {{count}} {{source}} sources.",
	}),
	copy.literal("Read {{count}} {{source}} sources.", {
		source: "agent",
		count: 3,
	}),
])("preserves summary descriptors and interpolation values", async (summary) => {
	const tool = defineAgentTool({
		name: "source_summary",
		description: "Reads sources",
		input: schema,
		output,
		permissions: [],
		readOnly: true,
		handler: async () => ({
			error: undefined,
			data: { output: { source: "agent" }, summary },
		}),
	});
	expect(
		await executeAgentTool({
			context,
			tool,
			input: {},
			execution: {
				authority: { principal: user, permissions: [], superAdmin: false },
				actor: { kind: "user", userId: 1 },
				run,
				signal: AbortSignal.timeout(1000),
				operationId: "source-summary",
			},
		}),
	).toEqual({
		type: "success",
		data: { output: { source: "agent" }, summary },
	});
});

test.each([
	["a server-scoped summary", copy("server:test.source.read")],
	["an empty summary", ""],
	["a blank summary", "   "],
	["an oversized summary", "x".repeat(2001)],
])("falls back to the title for %s instead of failing the call", async (_, summary) => {
	const tool = defineAgentTool({
		name: "invalid_summary",
		title: "Read source",
		description: "Returns a valid output with invalid transcript copy",
		input: schema,
		output,
		permissions: [],
		readOnly: true,
		// @ts-expect-error Agent summaries only accept admin copy.
		handler: async () => ({
			error: undefined,
			data: { output: { source: "agent" }, summary },
		}),
	});
	expect(
		await executeAgentTool({
			context,
			tool,
			input: {},
			execution: {
				authority: { principal: user, permissions: [], superAdmin: false },
				actor: { kind: "user", userId: 1 },
				run,
				signal: AbortSignal.timeout(1000),
				operationId: "invalid-summary",
			},
		}),
	).toEqual({
		type: "success",
		data: { output: { source: "agent" }, summary: copy.literal("Read source") },
	});
});

test("describes a call from its input, or by its title when the input is invalid", () => {
	const tool = defineAgentTool({
		name: "describe_source",
		title: "Read source",
		description: "Reads one source",
		input: z.object({ id: z.number() }),
		output,
		permissions: [],
		readOnly: true,
		describe: ({ id }) => `Read source ${id}`,
		handler: async () => ({
			error: undefined,
			data: { output: { source: "agent" }, summary: "Read the source." },
		}),
	});
	expect(tool.describe({ id: 7 })).toEqual(copy.literal("Read source 7"));
	expect(tool.describe({ id: "7" })).toEqual(copy.literal("Read source"));
});

test("interaction schemas preserve raw JSON across validation and apply transforms once in the handler", async () => {
	const tool = defineAgentTool({
		name: "transform_picker",
		description: "Transform test",
		input: z.object({}),
		output: z.object({ count: z.number() }),
		permissions: [],
		readOnly: true,
		interaction: {
			key: "picker",
			version: 1,
			data: z.object({ count: z.number().transform((count) => count + 1) }),
			response: (data) =>
				z.object({
					count: z.number().transform((count) => count + data.count),
				}),
			prepare: async () => ({
				error: undefined,
				data: {
					interaction: {
						title: "Choose",
						placement: "inline",
						data: { count: 1 },
					},
				},
			}),
		},
		handler: async ({ response }) => ({
			error: undefined,
			data: {
				output: response,
				summary: "Accepted the transformed selection.",
			},
		}),
	});
	const execution = {
		authority: { principal: user, permissions: [], superAdmin: false },
		actor: { kind: "user", userId: 1 } as const,
		run,
		signal: AbortSignal.timeout(1000),
		operationId: "transform",
	};
	const prepared = await prepareAgentTool({
		context,
		tool,
		input: {},
		execution,
	});
	expect(prepared).toMatchObject({
		type: "success",
		data: { interaction: { data: { count: 1 } } },
	});
	const accepted = await tool[
		toolDefinitionInternal
	].interaction?.parseResponse({ count: 1 }, { count: 10 });
	expect(accepted).toEqual({ error: undefined, data: { count: 10 } });
	const result = await executeAgentTool({
		context,
		tool,
		input: {},
		execution: {
			...execution,
			interaction: { data: { count: 1 }, response: { count: 10 } },
		},
	});
	expect(result).toMatchObject({
		type: "success",
		data: { output: { count: 12 } },
	});
});
