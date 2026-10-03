import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import isWebSourceAllowed from "../../helpers/is-web-source-allowed.js";
import runWebResearch from "../../helpers/run-web-research.js";
import type { inputSchema, outputSchema } from "./schema.js";

const maxResults = 5;

const searchWeb: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			execution: AgentToolExecution;
			allowedDomains?: string[];
		},
	],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, { input, execution, allowedDomains }) => {
	const response = await runWebResearch(context, {
		execution,
		request: {
			feature: { key: "web.search", version: "v1" },
			sessionId: execution.run.conversationId,
			input: [],
			context: { ...input, allowedDomains, maxResults },
		},
	});
	if (response.error) return response;

	const { output } = response.data;
	if (!("results" in output)) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.remote.web.failed.message"),
			},
		};
	}

	const results = output.results.filter((result) =>
		isWebSourceAllowed(result.url, allowedDomains),
	);

	//* the website applies the same policy; checked again so the CMS never trusts it blindly
	return {
		error: undefined,
		data: {
			output: { results },
			summary: copy(
				results.length === 1
					? "admin:core.tools.web_search.summary.one"
					: "admin:core.tools.web_search.summary",
				{
					data: { count: results.length, query: input.query.slice(0, 500) },
				},
			),
		},
	};
};

export default searchWeb;
