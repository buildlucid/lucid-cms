import type { ExternalScope } from "../permission/external-scopes.js";

export type DefineSkillOptions<Name extends string> = {
	/** Stable, unique skill name using lowercase letters, numbers and single hyphens. */
	name: Name;
	/** What the skill does and when to use it. Clients show this before loading the instructions. */
	description: string;
	/** Markdown instructions. Common indentation is removed, so template literals can be indented. */
	instructions: string;
	/** Scopes the caller must hold to see the skill. Pass `[]` to allow any authenticated caller. */
	scopes: readonly ExternalScope[];
};

/** A skill definition created with `defineSkill`. Register it with `ai.mcp.skills` or an agent's `skills`. */
export type SkillDefinition<Name extends string = string> = {
	readonly type: "skill-definition";
	readonly name: Name;
	readonly description: string;
	readonly instructions: string;
	readonly scopes: readonly ExternalScope[];
};
