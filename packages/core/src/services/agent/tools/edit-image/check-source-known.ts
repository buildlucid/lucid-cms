import { getAgent } from "../../../../libs/agent/registry.js";
import { copy } from "../../../../libs/i18n/index.js";
import {
	AgentMediaReferencesRepository,
	MediaTranslationsRepository,
} from "../../../../libs/repositories/index.js";
import type { AgentToolExecution } from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { analyzeMediaToolName } from "../analyze-media/constants.js";
import {
	editImageToolName,
	generateImageToolName,
} from "../generate-image/constants.js";

const describingTools = [
	analyzeMediaToolName,
	generateImageToolName,
	editImageToolName,
];

/** Requires alt text or prior analysis, generation or editing in this chat when a matching analysis tool exists. */
const checkSourceKnown: ServiceFn<
	[{ mediaId: number; mimeType: string; execution: AgentToolExecution }],
	undefined
> = async (context, { mediaId, mimeType, execution }) => {
	const analyzer = getAgent(context.config, execution.run.agentKey)?.tools.find(
		(tool) =>
			tool.capabilities?.mediaAnalysis?.mimeTypes.some(
				(type) =>
					type === mimeType ||
					(type.endsWith("/*") && mimeType.startsWith(type.slice(0, -1))),
			),
	);
	if (!analyzer) return { error: undefined, data: undefined };

	const MediaTranslations = new MediaTranslationsRepository(context.db);
	const AgentMediaReferences = new AgentMediaReferencesRepository(context.db);

	const [described, linked] = await Promise.all([
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
				{ key: "tool_name", operator: "in", value: describingTools },
			],
		}),
	]);
	if (described.error) return described;
	if (linked.error) return linked;
	if (described.data || linked.data)
		return { error: undefined, data: undefined };

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
