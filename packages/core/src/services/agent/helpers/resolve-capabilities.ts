import z from "zod";
import { getRunnerTools } from "../../../libs/agent/built-in-tools.js";
import buildInstructions from "../../../libs/agent/instructions.js";
import type { RunMode } from "../../../libs/agent/types.js";
import { getExternalCapability } from "../../../libs/permission/capabilities.js";
import { getSkillRegistry } from "../../../libs/skills/registry.js";
import { getToolRegistry } from "../../../libs/tools/registry.js";
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

/** Only advertises capabilities this user can access. Resolved once per slice of a run. */
const resolveCapabilities = (
	context: ServiceContext,
	props: { authority: AgentToolAuthority; mode: RunMode },
) => {
	const tools = [...getToolRegistry(context.config, "agent").values()].filter(
		(tool) =>
			props.authority.superAdmin ||
			tool.permissions.every((permission) =>
				props.authority.permissions.includes(permission),
			),
	);
	// Skills still use their existing scope contract; resolve it from current user permissions.
	const skills = [...getSkillRegistry(context.config).values()].filter(
		(skill) =>
			skill.targets.includes("agent") &&
			skill.scopes.every((scope) => {
				const capability = getExternalCapability(context.config, scope, "user");
				return (
					capability &&
					(capability.userPermission === null ||
						props.authority.superAdmin ||
						props.authority.permissions.includes(capability.userPermission))
				);
			}),
	);
	const runnerTools = getRunnerTools({
		mode: props.mode,
		hasSkills: skills.length > 0,
	});

	return {
		tools,
		skills,
		definitions: [...tools, ...runnerTools].map((tool) => ({
			name: tool.name,
			description: tool.description,
			inputSchema: toInputSchema(tool.input),
		})),
		instructions: buildInstructions({ mode: props.mode, skills }),
	};
};

export default resolveCapabilities;
