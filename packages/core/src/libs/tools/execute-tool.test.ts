import { afterAll, beforeAll, expect, test, vi } from "vitest";
import z from "zod";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../i18n/index.js";
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
	data: { output: { source: "agent" } },
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
const runAgent = (authority: AgentToolAuthority) =>
	executeAgentTool({
		context,
		tool: agentTool,
		input: {},
		execution: {
			authority,
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
	).toMatchObject({ type: "success", data: { output: { source: "agent" } } });
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
			data: { output: response },
		}),
	});
	const execution = {
		authority: { principal: user, permissions: [], superAdmin: false },
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
