import dedent from "../../utils/helpers/dedent.js";
import type { AgentDefinition, DefineAgentOptions } from "./types.js";

/**
 * Defines an agent for the admin. Lucid's content tools are always available;
 * additional tools and content access use each person's permissions.
 *
 * @example
 * const seoAgent = defineAgent({
 * 	key: "seo",
 * 	name: "SEO Agent",
 * 	description: "Reviews and improves page metadata.",
 * 	tools: [customAgentTool],
 * });
 */
const defineAgent = <const Key extends string>(
	options: DefineAgentOptions<Key>,
): AgentDefinition<Key> => ({
	type: "agent-definition",
	key: options.key,
	name: options.name,
	description: options.description,
	instructions: options.instructions ? dedent(options.instructions) : "",
	tools: options.tools ?? [],
	skills: options.skills ?? [],
	routines: options.routines ?? [],
});

export default defineAgent;
