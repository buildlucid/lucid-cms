import z from "zod";
import {
	getAvailableTools,
	getCapabilityProviders,
} from "../../../libs/agent/capabilities.js";
import buildInstructions from "../../../libs/agent/instructions/index.js";
import type { MemoryContext } from "../../../libs/agent/instructions/memories.js";
import { getRunnerTools } from "../../../libs/agent/runner-tools.js";
import type {
	AgentDefinition,
	ModelToolDefinition,
	RunMode,
} from "../../../libs/agent/types.js";
import { getExternalCapability } from "../../../libs/permission/capabilities.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import allowOptionalNulls from "../../../libs/tools/allow-optional-nulls.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { AgentScreen, AiAccessFeature } from "../../../types/response.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { deleteMemoryToolName } from "../tools/memory-delete/constants.js";
import { saveMemoryToolName } from "../tools/memory-save/constants.js";
import getMemoryScopes from "./get-memory-scopes.js";

const memoryToolNames: ReadonlySet<string> = new Set([
	saveMemoryToolName,
	deleteMemoryToolName,
]);

//* definitions are immutable, so each input schema only needs converting once
const inputSchemas = new WeakMap<z.ZodObject, Record<string, unknown>>();
const toInputSchema = (input: z.ZodObject) => {
	const existing = inputSchemas.get(input);
	if (existing) return existing;

	const schema = allowOptionalNulls(z.toJSONSchema(input, { io: "input" }));
	inputSchemas.set(input, schema);
	return schema;
};

/**
 * Resolves accessible tools, skills and instructions before each model turn.
 * @remarks System runs omit tools with required interactions and controls that ask a person.
 */
const resolveRunSetup = (
	context: Pick<ServiceContext, "config" | "translate">,
	props: {
		agent: AgentDefinition;
		authority: AgentToolAuthority;
		/** Organisation AI permissions used to filter available tools. */
		aiAccess: readonly AiAccessFeature[];
		mode: RunMode;
		hasHistory: boolean;
		/** The admin screen the person's latest message came from. */
		screen?: AgentScreen;
		/** Memories the run follows, when the agent reads them. */
		memories?: Omit<MemoryContext, "save">;
	},
) => {
	const { agent, authority } = props;
	const screen = props.screen
		? { type: props.screen.type, builder: agent.features.builder }
		: undefined;
	const attended = authority.principal.type === "user";
	const memoryScopes = getMemoryScopes(
		context.config,
		hasPermission(authority, Permissions.AiMemoriesManage),
	);
	const tools = getAvailableTools(agent, authority, {
		config: context.config,
		aiAccess: props.aiAccess,
		screen: screen?.type,
		mode: props.mode,
	})
		.filter((tool) => attended || (tool.interaction?.skippable ?? true))
		//* Hide memory tools when the user has no enabled, writable scope.
		.filter(
			(tool) => memoryScopes.length > 0 || !memoryToolNames.has(tool.name),
		);

	const skills = agent.skills.filter((skill) =>
		skill.scopes.every((scope) => {
			const capability = getExternalCapability(context.config, scope, "user");
			return (
				capability &&
				(capability.userPermission === null ||
					hasPermission(authority, capability.userPermission))
			);
		}),
	);

	const runnerTools = getRunnerTools({
		mode: props.mode,
		attended,
		hasSkills: skills.length > 0,
		hasHistory: props.hasHistory,
	});
	//* Runner controls first, then task tools in their configured order. Keep this stable between turns.
	const orderedTools = [...runnerTools, ...tools];

	return {
		tools,
		skills,
		presentation: new Map(
			orderedTools.map((tool) => [
				tool.name,
				{
					title: tool.title,
					describe: (input: Record<string, unknown>) =>
						"describe" in tool ? tool.describe(input) : tool.title,
					//* runner tools show widgets instead of versioned outputs
					outputVersion:
						"outputVersion" in tool ? tool.outputVersion : undefined,
				},
			]),
		),
		definitions: orderedTools.map((tool): ModelToolDefinition => ({
			name: tool.name,
			description:
				typeof tool.description === "function"
					? tool.description({
							mode: props.mode,
							screen: screen?.builder.read ? screen.type : undefined,
						})
					: tool.description,
			inputSchema: toInputSchema(tool.input),
		})),
		instructions: buildInstructions({
			//* the prompt stays the same for everyone, so the name uses the default language
			agent: {
				name: context.translate.forLocale(context.config.i18n.defaultLocale)(
					agent.name,
				),
				instructions: agent.instructions,
			},
			siteContext: context.config.ai.context,
			localization: context.config.localization,
			mode: props.mode,
			attended,
			skills,
			capabilities: getCapabilityProviders({ tools }),
			hasHistory: props.hasHistory,
			screen,
			memory: props.memories && {
				...props.memories,
				save: tools.some((tool) => tool.name === saveMemoryToolName)
					? { scopes: memoryScopes }
					: undefined,
			},
		}),
	};
};

export type RunSetup = ReturnType<typeof resolveRunSetup>;

export default resolveRunSetup;
