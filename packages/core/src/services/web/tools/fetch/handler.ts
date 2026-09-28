import type z from "zod";
import { contextLimits } from "../../../../libs/agent/context.js";
import { copy } from "../../../../libs/i18n/index.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import isUrlInConversation from "../../helpers/is-url-in-conversation.js";
import isWebSourceAllowed from "../../helpers/is-web-source-allowed.js";
import runWebResearch from "../../helpers/run-web-research.js";
import type { inputSchema, outputSchema } from "./schema.js";

//* leaves room for the URL, title and other fields, so a page fits in context uncut
const maxChars = contextLimits.messageChars - 4_000;

/**
 * Reads one public webpage the conversation has already mentioned, within the
 * project's allowed sources.
 */
const fetchWeb: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			execution: AgentToolExecution;
			allowedDomains?: string[];
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, { input, execution, allowedDomains }) => {
	const notAllowed = {
		data: undefined,
		error: {
			type: "basic",
			status: 403,
			message: copy("server:core.ai.remote.web.source.not.allowed.message"),
		},
	} as const;
	if (!isWebSourceAllowed(input.url, allowedDomains)) return notAllowed;

	const seen = await isUrlInConversation(context, {
		url: input.url,
		conversationId: execution.run.conversationId,
	});
	if (seen.error) return seen;
	if (!seen.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.web.url.unseen"),
			},
		};
	}

	const response = await runWebResearch(context, {
		execution,
		request: {
			feature: { key: "web.fetch", version: "v1" },
			sessionId: execution.run.conversationId,
			input: [],
			context: { ...input, allowedDomains, maxChars },
		},
	});
	if (response.error) return response;

	const { output } = response.data;
	if ("results" in output) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.remote.web.failed.message"),
			},
		};
	}

	//* the page may have redirected outside the allowed sources
	if (!isWebSourceAllowed(output.url, allowedDomains)) return notAllowed;

	return { error: undefined, data: { output } };
};

export default fetchWeb;
