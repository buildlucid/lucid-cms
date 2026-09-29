import runnerTools from "../../../libs/agent/runner-tools.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import scanMessages from "../../agent/helpers/scan-messages.js";
import { analyzeResourceToolName } from "../../agent/tools/analyze-resource/constants.js";
import { addWebUrlKeys, webUrlKey } from "./url-keys.js";

/**
 * Tools whose results can repeat the agent's own words, so they cannot vouch
 * for a URL. File analysis is written by a model that sees the agent's
 * question, so a file could make it echo that question back inside a URL.
 */
const echoingTools: ReadonlySet<string> = new Set([
	...[
		runnerTools.history,
		runnerTools.progress,
		runnerTools.skill,
		runnerTools.finish,
	].map((tool) => tool.name),
	analyzeResourceToolName,
]);

/**
 * Whether a URL appeared in this chat in something the agent did not write: a
 * person's message or a tool result, including CMS content a tool read. This
 * stops the agent reading a URL it made up, such as a known page with data
 * added to its query string.
 */
const isUrlInConversation: ServiceFn<
	[{ url: string; conversationId: string }],
	boolean
> = async (context, input) => {
	const key = webUrlKey(input.url);
	if (!key) return { error: undefined, data: false };

	const keys = new Set<string>();

	return scanMessages(context, {
		conversationId: input.conversationId,
		visit: (message) => {
			for (const part of message.parts) {
				if (message.role === "user" && part.type === "text") {
					addWebUrlKeys(keys, part.text);
				} else if (part.type === "tool" && !echoingTools.has(part.name)) {
					addWebUrlKeys(keys, JSON.stringify(part.output ?? null));
				}
			}

			return keys.has(key);
		},
	});
};

export default isUrlInConversation;
