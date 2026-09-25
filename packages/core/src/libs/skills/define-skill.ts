import type { DefineSkillOptions, SkillDefinition } from "./types.js";

/** Removes shared indentation so indented template literals stay valid markdown. */
const dedent = (text: string) => {
	const lines = text.split("\n");
	const indent = Math.min(
		...lines
			.filter((line) => line.trim())
			.map((line) => line.length - line.trimStart().length),
	);

	return lines
		.map((line) => line.slice(indent))
		.join("\n")
		.trim();
};

/** Defines an Agent Skill for project code, plugins or Lucid itself. */
const defineSkill = <const Name extends string>(
	options: DefineSkillOptions<Name>,
): SkillDefinition<Name> => ({
	type: "skill-definition",
	targets:
		typeof options.target === "string" ? [options.target] : options.target,
	name: options.name,
	description: options.description,
	instructions: dedent(options.instructions),
	scopes: options.scopes,
});

export default defineSkill;
