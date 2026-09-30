import type z from "zod";
import analyzeMedia from "../../../../libs/lucid-remote/services/analyze-media/index.js";
import type { AgentToolHandler } from "../../../../libs/tools/types.js";
import runPaidToolRequest from "../../helpers/run-paid-tool-request.js";
import resolveSource from "./resolve-source.js";
import type { inputSchema, outputSchema } from "./schema.js";

const handler: AgentToolHandler<
	z.output<typeof inputSchema>,
	z.output<typeof outputSchema>
> = async ({ context, input, execution }) => {
	const source = await resolveSource(context, {
		source: input.source,
		execution,
	});
	if (source.error) return source;

	const result = await runPaidToolRequest(context, {
		execution,
		featureKey: "media.analyze",
		timeoutMs: 120_000,
		send: (paid) =>
			analyzeMedia(context, {
				...paid,
				request: {
					feature: { key: "media.analyze", version: "v1" },
					sessionId: execution.run.conversationId,
					input: [],
					context: { question: input.question, source: source.data },
				},
			}),
	});
	if (result.error) return result;

	return { error: undefined, data: { output: result.data.output } };
};

export default handler;
