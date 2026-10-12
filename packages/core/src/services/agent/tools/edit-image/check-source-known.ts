import { getAvailableTools } from "../../../../libs/agent/capabilities.js";
import { getAgent } from "../../../../libs/agent/registry.js";
import { copy } from "../../../../libs/i18n/index.js";
import {
	AgentMediaReferencesRepository,
	MediaTranslationsRepository,
} from "../../../../libs/repositories/index.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getAiAccess from "../../../connection/get-ai-access.js";
import scanMessages from "../../helpers/scan-messages.js";
import { analyzeMediaToolName } from "../analyze-media/constants.js";
import { inputSchema as analyzeInputSchema } from "../analyze-media/schema.js";
import {
	editImageToolName,
	generateImageToolName,
} from "../generate-image/constants.js";

/** Requires alt text or prior chat analysis, generation or editing when an image analyzer is available. */
const checkSourceKnown: ServiceFn<
	[{ mediaId: number; mimeType: string; execution: AgentToolExecution }],
	undefined
> = async (context, { mediaId, mimeType, execution }) => {
	const agent = getAgent(context.config, execution.run.agentKey);
	if (!agent) return { error: undefined, data: undefined };

	const aiAccess = await getAiAccess(context, {});
	if (aiAccess.error) return aiAccess;

	const analyzer = getAvailableTools(agent, execution.authority, {
		config: context.config,
		aiAccess: aiAccess.data,
		screen: execution.screen?.type,
	}).find((tool) =>
		tool.capabilities?.mediaAnalysis?.mimeTypes.some(
			(type) =>
				type === mimeType ||
				(type.endsWith("/*") && mimeType.startsWith(type.slice(0, -1))),
		),
	);
	if (!analyzer) return { error: undefined, data: undefined };

	const MediaTranslations = new MediaTranslationsRepository(context.db);
	const AgentMediaReferences = new AgentMediaReferencesRepository(context.db);

	const [described, created] = await Promise.all([
		MediaTranslations.selectSingle({
			select: ["id"],
			where: [
				{ key: "media_id", operator: "=", value: mediaId },
				{ key: "alt", operator: "is not", value: null },
				{ key: "alt", operator: "!=", value: "" },
			],
		}),
		AgentMediaReferences.selectSingle({
			select: ["id"],
			where: [
				{
					key: "conversation_id",
					operator: "=",
					value: execution.run.conversationId,
				},
				{ key: "media_id", operator: "=", value: mediaId },
				{
					key: "tool_name",
					operator: "in",
					value: [generateImageToolName, editImageToolName],
				},
			],
		}),
	]);
	if (described.error) return described;
	if (created.error) return created;
	if (described.data || created.data) {
		return { error: undefined, data: undefined };
	}

	//* reattachment overwrites references, so check tool calls for prior analysis
	const analyzed = await scanMessages(context, {
		conversationId: execution.run.conversationId,
		visit: (message) =>
			message.parts.some(
				(part) =>
					part.type === "tool" &&
					part.status === "complete" &&
					part.name === analyzeMediaToolName &&
					analyzeInputSchema.safeParse(part.input).data?.mediaId === mediaId,
			),
	});
	if (analyzed.error) return analyzed;
	if (analyzed.data) return { error: undefined, data: undefined };

	return {
		data: undefined,
		error: {
			type: "basic",
			status: 409,
			message: copy("server:agent.image.edit.source.unknown", {
				data: { id: mediaId, tool: analyzer.name },
			}),
		},
	};
};

export default checkSourceKnown;
