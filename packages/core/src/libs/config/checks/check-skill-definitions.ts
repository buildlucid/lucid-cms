import type { ResolvedLucidConfig } from "../../../types/config.js";
import { getExternalCapability } from "../../permission/capabilities.js";

/** Checks skill names, content, scopes and operator disable entries at config time. */
const checkSkillDefinitions = (config: ResolvedLucidConfig) => {
	const names = new Set<string>();

	for (const skill of config.ai.skills.definitions) {
		if (
			skill.targets.length === 0 ||
			skill.targets.some((target) => target !== "mcp" && target !== "agent")
		) {
			throw new Error(`Skill "${skill.name}" has an unsupported target.`);
		}
		// Agent Skills naming rules, which MCP clients verify.
		if (
			skill.name.length > 64 ||
			!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill.name)
		) {
			throw new Error(
				`Invalid skill name "${skill.name}". Use lowercase letters, numbers and single hyphens.`,
			);
		}

		if (names.has(skill.name)) {
			throw new Error(`Skill "${skill.name}" is registered more than once.`);
		}

		names.add(skill.name);

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
	}

	const disabled = new Set<string>();

	for (const name of config.ai.skills.disabled) {
		if (disabled.has(name)) {
			throw new Error(`Skill "${name}" is disabled more than once.`);
		}

		disabled.add(name);

		if (!names.has(name)) {
			throw new Error(`Disabled skill "${name}" is not registered.`);
		}
	}
};

export default checkSkillDefinitions;
