import z from "zod";
import { getRunnerTools } from "../../../libs/agent/built-in-tools.js";
import buildInstructions from "../../../libs/agent/instructions.js";
import type { AgentDefinition, RunMode } from "../../../libs/agent/types.js";
import { getExternalCapability } from "../../../libs/permission/capabilities.js";
import { getCoreAgentTools } from "../../../libs/tools/core-tools.js";
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

/** Only advertises the agent's capabilities its principal can access. Resolved before each model turn. */
const resolveCapabilities = (
	context: ServiceContext,
	props: {
		agent: AgentDefinition;
		authority: AgentToolAuthority;
		mode: RunMode;
		hasHistory: boolean;
	},
) => {
	const { agent, authority } = props;
	const tools = [...getCoreAgentTools(), ...agent.tools].filter(
		(tool) =>
			authority.superAdmin ||
			tool.permissions.every((permission) =>
				authority.permissions.includes(permission),
			),
	);

	// Skills still use their existing scope contract; resolve it from current permissions.
	const skills = agent.skills.filter((skill) =>
		skill.scopes.every((scope) => {
			const capability = getExternalCapability(context.config, scope, "user");
			return (
				capability &&
				(capability.userPermission === null ||
					authority.superAdmin ||
					authority.permissions.includes(capability.userPermission))
			);
		}),
	);

	const canAsk = authority.principal.type === "user";
	const runnerTools = getRunnerTools({
		mode: props.mode,
		canAsk,
		hasSkills: skills.length > 0,
		hasHistory: props.hasHistory,
	});

	return {
		tools,
		skills,
		definitions: [...tools, ...runnerTools].map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: toInputSchema(tool.input),
		})),
		instructions: buildInstructions({
			agent,
			mode: props.mode,
			canAsk,
			skills,
			hasHistory: props.hasHistory,
		}),
	};
};

export default resolveCapabilities;
