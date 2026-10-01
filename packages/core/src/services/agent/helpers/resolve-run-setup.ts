import z from "zod";
import {
	getAvailableTools,
	getCapabilityProviders,
} from "../../../libs/agent/capabilities.js";
import buildInstructions from "../../../libs/agent/instructions.js";
import { getRunnerTools } from "../../../libs/agent/runner-tools.js";
import type {
	AgentDefinition,
	ModelToolDefinition,
	RunMode,
} from "../../../libs/agent/types.js";
import { getExternalCapability } from "../../../libs/permission/capabilities.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type { AgentToolAuthority } from "../../../libs/tools/types.js";
import type { ServiceContext } from "../../../utils/services/types.js";

//* definitions are immutable, so each input schema only needs converting once
const inputSchemas = new WeakMap<z.ZodObject, Record<string, unknown>>();
const toInputSchema = (input: z.ZodObject) => {
	const existing = inputSchemas.get(input);
	if (existing) return existing;

	const schema = z.toJSONSchema(input, { io: "input" });
	inputSchemas.set(input, schema);
	return schema;
};

/** A run's tools, skills and instructions, limited to what its principal can access. Resolved before each model turn. */
const resolveRunSetup = (
	context: ServiceContext,
	props: {
		agent: AgentDefinition;
		authority: AgentToolAuthority;
		mode: RunMode;
		hasHistory: boolean;
	},
) => {
	const { agent, authority } = props;
	const tools = getAvailableTools(agent, authority);

	// Skills still use their existing scope contract; resolve it from current permissions.
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
		hasSkills: skills.length > 0,
		hasHistory: props.hasHistory,
	});

	return {
		tools,
		skills,
		presentation: new Map(
			[...tools, ...runnerTools].map((tool) => [
				tool.name,
				{ title: tool.title, display: tool.display },
			]),
		),
		definitions: [...tools, ...runnerTools].map(
			(tool): ModelToolDefinition => ({
				name: tool.name,
				description:
					typeof tool.description === "function"
						? tool.description({ mode: props.mode })
						: tool.description,
				inputSchema: toInputSchema(tool.input),
			}),
		),
		instructions: buildInstructions({
			agent,
			mode: props.mode,
			skills,
			capabilities: getCapabilityProviders({ tools }),
			hasHistory: props.hasHistory,
		}),
	};
};

export type RunSetup = ReturnType<typeof resolveRunSetup>;

export default resolveRunSetup;
