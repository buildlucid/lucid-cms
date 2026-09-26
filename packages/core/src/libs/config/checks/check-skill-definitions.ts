import type { ResolvedLucidConfig } from "../../../types/config.js";
import { getExternalCapability } from "../../permission/capabilities.js";
import { isSkillDefinition } from "../../skills/registry.js";
import type { SkillDefinition } from "../../skills/types.js";

/** Checks a skill's name, content and scopes. */
const checkSkill = (config: ResolvedLucidConfig, skill: SkillDefinition) => {
	// Agent Skills naming rules, which MCP clients verify.
	if (skill.name.length > 64 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill.name)) {
		throw new Error(
			`Invalid skill name "${skill.name}". Use lowercase letters, numbers and single hyphens.`,
		);
	}
	if (!skill.description.trim() || skill.description.length > 1024) {
		throw new Error(
			`Skill "${skill.name}" needs a description of up to 1024 characters.`,
		);
	}
	if (!skill.instructions) {
		throw new Error(`Skill "${skill.name}" needs instructions.`);
	}

	for (const scope of skill.scopes) {
		if (!getExternalCapability(config, scope)) {
			throw new Error(`Skill "${skill.name}" uses unknown scope "${scope}".`);
		}
	}
};

/** Checks that a placement only holds skills, with unique names. */
const checkPlacement = (label: string, skills: readonly unknown[]) => {
	const names = new Set<string>();

	for (const skill of skills) {
		if (!isSkillDefinition(skill)) {
			throw new Error(`${label} skills must be created with defineSkill.`);
		}
		if (names.has(skill.name)) {
			throw new Error(
				`${label} registers skill "${skill.name}" more than once.`,
			);
		}
		names.add(skill.name);
	}
};

/** Checks MCP and agent skills at config time. A skill shared by several agents is checked once. */
const checkSkillDefinitions = (config: ResolvedLucidConfig) => {
	const checked = new Set<SkillDefinition>(config.ai.mcp.skills);
	checkPlacement("MCP", config.ai.mcp.skills);

	for (const agent of config.ai.agents) {
		checkPlacement(`Agent "${agent.key}"`, agent.skills);
		for (const skill of agent.skills) checked.add(skill);
	}

	for (const skill of checked) checkSkill(config, skill);
};

export default checkSkillDefinitions;
