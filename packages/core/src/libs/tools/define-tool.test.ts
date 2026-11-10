import { afterAll, beforeAll, expect, test } from "vitest";
import z from "zod";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../i18n/index.js";
import { Permissions } from "../permission/definitions.js";
import { ExternalScopes } from "../permission/external-scopes.js";
import defineTool from "./define-tool.js";
import { toolDefinitionInternal } from "./tool-definition-internal.js";
import type { AgentToolInvocation, McpToolExecution } from "./types.js";

const tool = defineTool({
	name: "site_echo",
	description: "Return the message.",
	input: z.object({ message: z.string() }),
	output: z.object({ message: z.string(), surface: z.string() }),
	readOnly: true,
	agent: { permissions: [Permissions.MediaRead], parallelSafe: true },
	mcp: {
		scopes: [ExternalScopes.MediaRead],
		annotations: { openWorldHint: true },
	},
	handler: ({ input, execution }) => ({
		output: { message: input.message, surface: execution.surface },
	}),
});

const testConfig = getTestConfig();
let context: ServiceContext;
beforeAll(async () => {
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});
afterAll(testConfig.destroy);

const run = async <Execution>(
	definition: {
		[toolDefinitionInternal]: {
			prepareInput: (input: unknown) => Promise<
				| {
						type: "ready";
						data: {
							run: (args: {
								context: ServiceContext;
								execution: Execution;
							}) => Promise<unknown>;
						};
				  }
				| { type: "invalid-input" }
			>;
		};
	},
	execution: Execution,
) => {
	const prepared = await definition[toolDefinitionInternal].prepareInput({
		message: "hi",
	});
	if (prepared.type !== "ready") throw new Error("Expected valid input.");
	return prepared.data.run({ context, execution });
};

test("each block sets how its surface offers the tool", () => {
	expect(tool.agent).toMatchObject({
		kind: "agent",
		name: "site_echo",
		permissions: [Permissions.MediaRead],
		readOnly: true,
		parallelSafe: true,
	});
	expect(tool.mcp).toMatchObject({
		kind: "mcp",
		name: "site_echo",
		scopes: [ExternalScopes.MediaRead],
		annotations: { readOnlyHint: true, openWorldHint: true },
	});
});

test("one handler serves both surfaces, with the agent summary defaulting to the title", async () => {
	expect(await run(tool.agent, {} as AgentToolInvocation)).toMatchObject({
		type: "success",
		data: {
			output: { message: "hi", surface: "agent" },
			summary: { value: "site echo" },
		},
	});
	expect(await run(tool.mcp, {} as McpToolExecution)).toMatchObject({
		type: "success",
		data: { output: { message: "hi", surface: "mcp" } },
	});
});

test("a tool is only defined for the surfaces it has a block for", () => {
	const agentOnly = defineTool({
		name: "agent_only",
		description: "Agents only.",
		input: z.object({}),
		output: z.object({}),
		agent: { permissions: [] },
		handler: () => ({ output: {} }),
	});

	expect(agentOnly).not.toHaveProperty("mcp");
	expect(agentOnly.agent.readOnly).toBe(false);
});
