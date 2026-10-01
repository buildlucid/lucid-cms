import { analyzeMediaAgentTool } from "../../services/agent/tools/analyze-media/index.js";
import { readFileAgentTool } from "../../services/agent/tools/read-file/index.js";
import { removeMediaOwnershipAgentTool } from "../../services/media/tools/remove-ownership/index.js";
import { resolveWebToolOptions } from "../../services/web/helpers/web-tool-options.js";
import { webFetchAgentTool } from "../../services/web/tools/fetch/index.js";
import { webSearchAgentTool } from "../../services/web/tools/search/index.js";
import dedent from "../../utils/helpers/dedent.js";
import { normalizeCopy } from "../i18n/copy.js";
import type { AgentDefinition, DefineAgentOptions } from "./types.js";

/**
 * Defines an agent for the admin. `features` turns Lucid's built-in tools on
 * or off, and `tools` adds more. Every tool uses the permissions of the person
 * the agent acts for.
 *
 * @example
 * const seoAgent = defineAgent({
 * 	key: "seo",
 * 	name: "SEO Agent",
 * 	description: "Reviews and improves page metadata.",
 * 	tools: [agentTools.content(), customAgentTool],
 * 	features: { web: { allowedDomains: ["example.com"] } },
 * 	models: {
 * 		default: { modelId: "openai/gpt-6-sol", reasoningEffort: "low" },
 * 		available: ["openai/gpt-6-luna", "openai/gpt-6-sol"],
 * 	},
 * });
 */
const defineAgent = <const Key extends string>(
	options: DefineAgentOptions<Key>,
): AgentDefinition<Key> => {
	const features = {
		media: {
			upload: options.features?.media?.upload ?? true,
			attach: options.features?.media?.attach ?? true,
			analyze: options.features?.media?.analyze ?? true,
			readFile: options.features?.media?.readFile ?? true,
		},
		documents: { attach: options.features?.documents?.attach ?? true },
		web: {
			search: options.features?.web?.search ?? true,
			read: options.features?.web?.read ?? true,
			...resolveWebToolOptions({
				allowedDomains: options.features?.web?.allowedDomains,
			}),
		},
	};

	return {
		type: "agent-definition",
		key: options.key,
		enabled: options.enabled ?? true,
		name: options.name,
		description: options.description,
		instructions: options.instructions ? dedent(options.instructions) : "",
		tools: [
			...(features.media.analyze ? [analyzeMediaAgentTool()] : []),
			...(features.media.readFile ? [readFileAgentTool()] : []),
			...(features.web.search
				? [
						webSearchAgentTool({
							allowedDomains: features.web.allowedDomains,
						}),
					]
				: []),
			...(features.web.read
				? [
						webFetchAgentTool({
							allowedDomains: features.web.allowedDomains,
						}),
					]
				: []),
			...(features.media.upload ? [removeMediaOwnershipAgentTool()] : []),
			...(options.tools?.flat() ?? []),
		],
		skills: options.skills ?? [],
		models: options.models,
		features,
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
	};
};

export default defineAgent;
