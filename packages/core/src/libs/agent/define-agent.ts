import dedent from "../../utils/helpers/dedent.js";
import { normalizeCopy } from "../i18n/copy.js";
import type { AgentDefinition, DefineAgentOptions } from "./types.js";

/**
 * Defines an agent for the admin. It has only the tools it lists, and each
 * uses the permissions of the person the agent acts for.
 *
 * @example
 * const seoAgent = defineAgent({
 * 	key: "seo",
 * 	name: "SEO Agent",
 * 	description: "Reviews and improves page metadata.",
 * 	tools: [agentTools.content(), agentTools.web(), customAgentTool],
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
	tools: options.tools?.flat() ?? [],
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
