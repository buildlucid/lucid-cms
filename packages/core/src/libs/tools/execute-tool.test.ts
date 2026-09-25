import { afterAll, beforeAll, expect, test, vi } from "vitest";
import z from "zod";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../i18n/index.js";
import { Permissions } from "../permission/definitions.js";
import { ExternalScopes } from "../permission/external-scopes.js";
import defineTool from "./define-tool.js";
import { executeAgentTool, executeMcpTool } from "./execute-tool.js";
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
const agentTool = defineTool({
	target: "agent",
	name: "shared_name",
	description: "Agent write",
	input: schema,
	output,
	permissions: [Permissions.MediaRead],
	requiredPermissions: () => [Permissions.MediaUpdate],
	handler: agentHandler,
});
const mcpTool = defineTool({
	target: "mcp",
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
				tools: {
					definitions: [
						agentTool,
						mcpTool,
						{ ...agentTool, name: "agent_only" },
					],
					disabled: [],
				},
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

const runAgent = (authority: AgentToolAuthority) =>
	executeAgentTool({
		context,
		name: "shared_name",
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
			userId: 1,
			permissions: [Permissions.MediaUpdate],
			superAdmin: false,
		}),
	).toEqual({ type: "forbidden" });
	expect(
		await runAgent({
			userId: 1,
			permissions: [Permissions.MediaRead],
			superAdmin: false,
		}),
	).toEqual({ type: "forbidden" });
	expect(agentHandler).not.toHaveBeenCalled();
	expect(
		await runAgent({
			userId: 1,
			permissions: [Permissions.MediaRead, Permissions.MediaUpdate],
			superAdmin: false,
		}),
	).toMatchObject({ type: "success", data: { output: { source: "agent" } } });
	expect(agentHandler).toHaveBeenLastCalledWith(
		expect.objectContaining({
			execution: expect.objectContaining({ operationId: "run:call" }),
		}),
	);
	expect(
		await runAgent({ userId: 1, permissions: [], superAdmin: true }),
	).toMatchObject({ type: "success" });
	expect(
		await runAgent({ userId: 1, permissions: [], superAdmin: false }),
	).toEqual({ type: "forbidden" });
});

test("MCP resolves only MCP definitions and requires scopes even for the same name", async () => {
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
		await executeMcpTool({ context, name: "agent_only", input: {}, execution }),
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
