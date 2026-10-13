import { analyzeMediaAgentTool } from "../../services/agent/tools/analyze-media/index.js";
import { builderFocusAgentTool } from "../../services/agent/tools/builder-focus/index.js";
import { builderReadAgentTool } from "../../services/agent/tools/builder-read/index.js";
import { builderUpdateAgentTool } from "../../services/agent/tools/builder-update/index.js";
import { editImageAgentTool } from "../../services/agent/tools/edit-image/index.js";
import { generateAudioAgentTool } from "../../services/agent/tools/generate-audio/index.js";
import { generateImageAgentTool } from "../../services/agent/tools/generate-image/index.js";
import { readFileAgentTool } from "../../services/agent/tools/read-file/index.js";
import { addMediaToLibraryAgentTool } from "../../services/media/tools/add-to-library/index.js";
import { resolveWebToolOptions } from "../../services/web/helpers/web-tool-options.js";
import { webReadAgentTool } from "../../services/web/tools/read/index.js";
import { webSearchAgentTool } from "../../services/web/tools/search/index.js";
import dedent from "../../utils/helpers/dedent.js";
import { normalizeCopy } from "../i18n/copy.js";
import type {
	AgentDefinition,
	AgentFeatures,
	AgentMediaGenerateOptions,
	DefineAgentOptions,
} from "./types.js";

const resolveGenerate = (
	generate: AgentMediaGenerateOptions = true,
): AgentFeatures["media"]["generate"] =>
	typeof generate === "boolean"
		? { image: generate, audio: generate }
		: { image: generate.image ?? true, audio: generate.audio ?? true };

/**
 * Defines an admin agent with built-in and custom tools.
 * @remarks `features` controls built-in tools, `tools` adds custom tools, and permissions follow the run's principal.
 *
 * @example
 * const seoAgent = defineAgent({
 * 	key: "seo",
 * 	name: "SEO Agent",
 * 	description: "Reviews and improves page metadata.",
 * 	tools: [agentTools.read(), customAgentTool],
 * 	features: { web: { allowedDomains: ["example.com"] } },
 * 	models: {
 * 		default: { modelId: "openai/gpt-sol", reasoningEffort: "low" },
 * 		available: ["openai/gpt-luna", "openai/gpt-sol"],
 * 	},
 * });
 */
const defineAgent = <const Key extends string>(
	options: DefineAgentOptions<Key>,
): AgentDefinition<Key> => {
	const builderRead = options.features?.builder?.read ?? true;
	const features = {
		media: {
			upload: options.features?.media?.upload ?? true,
			addToLibrary: options.features?.media?.addToLibrary ?? true,
			attach: options.features?.media?.attach ?? true,
			analyze: options.features?.media?.analyze ?? true,
			readFile: options.features?.media?.readFile ?? true,
			generate: resolveGenerate(options.features?.media?.generate),
		},
		documents: { attach: options.features?.documents?.attach ?? true },
		requests: { attach: options.features?.requests?.attach ?? true },
		builder: {
			read: builderRead,
			edit: options.features?.builder?.edit ?? builderRead,
		},
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
		sidebar: options.sidebar ?? true,
		name: normalizeCopy(options.name),
		description: normalizeCopy(options.description),
		instructions: options.instructions ? dedent(options.instructions) : "",
		tools: [
			...(features.media.analyze ? [analyzeMediaAgentTool()] : []),
			...(features.media.readFile ? [readFileAgentTool()] : []),
			...(features.media.generate.image
				? [generateImageAgentTool(), editImageAgentTool()]
				: []),
			...(features.media.generate.audio ? [generateAudioAgentTool()] : []),
			...(features.web.search
				? [
						webSearchAgentTool({
							allowedDomains: features.web.allowedDomains,
						}),
					]
				: []),
			...(features.web.read
				? [
						webReadAgentTool({
							allowedDomains: features.web.allowedDomains,
						}),
					]
				: []),
			...(features.media.addToLibrary ? [addMediaToLibraryAgentTool()] : []),
			...(features.builder.read
				? [builderReadAgentTool(), builderFocusAgentTool()]
				: []),
			...(features.builder.edit ? [builderUpdateAgentTool()] : []),
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
