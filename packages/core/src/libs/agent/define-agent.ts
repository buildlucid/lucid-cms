import dedent from "../../utils/helpers/dedent.js";
import { normalizeCopy } from "../i18n/copy.js";
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
 * 	models: {
 * 		default: { modelId: "openai/gpt-6-sol", reasoningEffort: "low" },
 * 		available: ["openai/gpt-6-luna", "openai/gpt-6-sol"],
 * 	},
 * });
 */
const defineAgent = <const Key extends string>(
	options: DefineAgentOptions<Key>,
): AgentDefinition<Key> => ({
	type: "agent-definition",
	key: options.key,
	enabled: options.enabled ?? true,
	name: options.name,
	description: options.description,
	instructions: options.instructions ? dedent(options.instructions) : "",
	tools: options.tools ?? [],
	skills: options.skills ?? [],
	models: options.models,
	suggestions: (options.suggestions ?? []).map((suggestion) => ({
		title: normalizeCopy(suggestion.title),
		description: normalizeCopy(suggestion.description),
		message: normalizeCopy(
			typeof suggestion.message === "string"
				? dedent(suggestion.message)
				: suggestion.message,
		),
	})),
	routines: options.routines ?? [],
});

export default defineAgent;
