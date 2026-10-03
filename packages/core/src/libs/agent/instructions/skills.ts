import type { SkillDefinition } from "../../skills/types.js";
import runnerTools from "../runner-tools.js";

export const skillInstructions = (
	skills: readonly Pick<SkillDefinition, "name" | "description">[],
) =>
	skills.length
		? [
				"## Skills",
				`You should load relevant skills via ${runnerTools.skill.name}, either if the user explicitly asks, or based on the available skills and their descriptions, one matches the intent of the conversation.`,
				"Available skills:",
				...skills.map((skill) => `- ${skill.name}: ${skill.description}`),
			].join("\n")
		: "";
