import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { mediaMimeTypeSchema } from "../../../../libs/lucid-remote/schema/media.js";
import analyzeMedia from "../../../../libs/lucid-remote/services/analyze-media/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveMediaSource from "../../helpers/resolve-media-source.js";
import runPaidToolRequest from "../../helpers/run-paid-tool-request.js";
import register from "../../references/register.js";
import { analyzeMediaToolName } from "./constants.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Sends authorised media to Lucid's analysis model with the agent's question, and links the media to the chat. */
const analyze: ServiceFn<
	[{ input: z.output<typeof inputSchema>; execution: AgentToolExecution }],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, { input, execution }) => {
	const source = await resolveMediaSource(context, {
		mediaId: input.mediaId,
		mimeTypes: mediaMimeTypeSchema,
		execution,
	});
	if (source.error) return source;

	const linked = await register(context, {
		conversationId: execution.run.conversationId,
		references: [{ type: "media", mediaId: input.mediaId }],
		source: { type: "tool", toolName: analyzeMediaToolName },
	});
	if (linked.error) return linked;

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

	return {
		error: undefined,
		data: {
			output: result.data.output,
			summary: copy("admin:core.tools.media_analyze.summary", {
				data: { id: input.mediaId },
			}),
		},
	};
};

export default analyze;
