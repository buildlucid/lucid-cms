import { z } from "zod";
import constants from "../../../constants/constants.js";
import { builderFocusToolName } from "../../../services/agent/tools/builder-focus/constants.js";
import { builderReadToolName } from "../../../services/agent/tools/builder-read/constants.js";
import { builderUpdateToolName } from "../../../services/agent/tools/builder-update/constants.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { runnerToolNames } from "../../agent/runner-tools.js";
import { getExternalCapability } from "../../permission/capabilities.js";
import { getValidPermissions } from "../../permission/registry.js";
import { coreToolWidgets, isToolDefinition } from "../../tools/registry.js";
import type {
	AgentToolCapabilities,
	ToolDefinition,
} from "../../tools/types.js";

const mimeCapabilitySchema = z
	.object({
		mimeTypes: z.array(z.string().regex(/^[a-z]+\/(\*|[a-z0-9.+-]+)$/)).min(1),
	})
	.strict();
const agentToolCapabilitiesSchema = z
	.object({
		media: z
			.object({
				analyze: mimeCapabilitySchema.optional(),
				readFile: mimeCapabilitySchema.optional(),
				generate: z
					.object({
						image: z.boolean().optional(),
						audio: z.boolean().optional(),
					})
					.strict()
					.optional(),
			})
			.strict()
			.optional(),
		web: z
			.object({ search: z.boolean().optional(), read: z.boolean().optional() })
			.strict()
			.optional(),
	})
	.strict()
	.optional() satisfies z.ZodType<AgentToolCapabilities | undefined>;

const reservedToolNames: ReadonlySet<string> = new Set([
	builderReadToolName,
	builderFocusToolName,
	builderUpdateToolName,
]);

/** Checks a tool's name, schemas and access requirements. */
const checkTool = (
	config: ResolvedLucidConfig,
	tool: ToolDefinition,
	permissions: ReadonlySet<string>,
) => {
	if (tool.name.length > 128 || !/^[a-z][a-z0-9._-]*$/.test(tool.name)) {
		throw new Error(`Invalid tool name "${tool.name}".`);
	}
	const descriptions =
		typeof tool.description === "function"
			? [
					tool.description({ mode: "chat" }),
					tool.description({ mode: "routine" }),
				]
			: [tool.description];
	if (
		descriptions.some(
			(description) => typeof description !== "string" || !description.trim(),
		)
	) {
		throw new Error(`Tool "${tool.name}" needs a description.`);
	}

	if (tool.kind === "mcp") {
		for (const scope of [
			...tool.scopes,
			...(tool.possibleScopes?.({ config }) ?? []),
		]) {
			if (!getExternalCapability(config, scope)) {
				throw new Error(`Tool "${tool.name}" uses unknown scope "${scope}".`);
			}
		}
	} else {
		if (
			tool.name.length > 64 ||
			!/^[a-z][a-z0-9_-]*$/.test(tool.name) ||
			descriptions.some((description) => description.length > 2000)
		) {
			throw new Error(
				`Agent tool "${tool.name}" needs a provider-compatible name (up to 64 characters) and description (up to 2000 characters).`,
			);
		}

		if (
			runnerToolNames.has(tool.name) ||
			(tool.name.startsWith(constants.agent.reservedToolPrefix) &&
				!reservedToolNames.has(tool.name))
		) {
			throw new Error(
				`Agent tool name "${tool.name}" is reserved. Names starting with "${constants.agent.reservedToolPrefix}" are for Lucid's own tools.`,
			);
		}

		if (
			tool.interaction &&
			(!tool.interaction.key ||
				(tool.interaction.key.startsWith(
					constants.agent.widgets.reservedPrefix,
				) &&
					!coreToolWidgets.get(tool.name)?.includes(tool.interaction.key)) ||
				!Number.isInteger(tool.interaction.version) ||
				tool.interaction.version < 1)
		) {
			throw new Error(
				`Agent tool "${tool.name}" needs an interaction key that does not start with "${constants.agent.widgets.reservedPrefix}" and a positive whole-number version.`,
			);
		}

		const capabilities = agentToolCapabilitiesSchema.safeParse(
			tool.capabilities,
		);
		if (!capabilities.success) {
			throw new Error(
				`Agent tool "${tool.name}" has invalid capabilities: ${z.prettifyError(capabilities.error)}`,
			);
		}

		for (const permission of tool.permissions) {
			if (!permissions.has(permission)) {
				throw new Error(
					`Tool "${tool.name}" uses unknown permission "${permission}".`,
				);
			}
		}
	}

	try {
		z.toJSONSchema(tool.input, { io: "input" });
		z.toJSONSchema(tool.output, { io: "output" });
	} catch (error) {
		throw new Error(`Tool "${tool.name}" has an unsupported schema.`, {
			cause: error,
		});
	}
};

/** Checks that a placement only holds tools of its kind, with unique names. */
const checkPlacement = (
	label: string,
	kind: ToolDefinition["kind"],
	tools: readonly unknown[],
) => {
	const names = new Set<string>();

	for (const tool of tools) {
		if (!isToolDefinition(tool) || tool.kind !== kind) {
			throw new Error(
				`${label} tools must be created with ${kind === "mcp" ? "defineMcpTool" : "defineAgentTool"}.`,
			);
		}

		if (names.has(tool.name)) {
			throw new Error(`${label} registers tool "${tool.name}" more than once.`);
		}

		names.add(tool.name);
	}
};

/** Checks MCP and agent tools at config time. A tool shared by several agents is checked once. */
const checkToolDefinitions = (config: ResolvedLucidConfig) => {
	const permissions = new Set(getValidPermissions(config));
	const checked = new Set<ToolDefinition>();

	const mcpTools = config.ai.mcp.tools;
	checkPlacement("MCP", "mcp", mcpTools);
	for (const tool of mcpTools) checked.add(tool);

	for (const agent of config.ai.agents.definitions) {
		const label = `Agent "${agent.key}"`;
		const tools = agent.tools;
		checkPlacement(label, "agent", tools);

		for (const tool of tools) checked.add(tool);
	}

	for (const tool of checked) checkTool(config, tool, permissions);
};

export default checkToolDefinitions;
