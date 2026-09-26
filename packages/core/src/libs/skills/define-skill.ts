import dedent from "../../utils/helpers/dedent.js";
import type { DefineSkillOptions, SkillDefinition } from "./types.js";

/** Defines an Agent Skill for project code, plugins or Lucid itself. */
const defineSkill = <const Name extends string>(
	options: DefineSkillOptions<Name>,
): SkillDefinition<Name> => ({
	type: "skill-definition",
	name: options.name,
	description: options.description,
	instructions: dedent(options.instructions),
	scopes: options.scopes,
});

export default defineSkill;
