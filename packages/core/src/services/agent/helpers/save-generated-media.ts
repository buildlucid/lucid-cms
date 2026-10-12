import type z from "zod";
import constants from "../../../constants/constants.js";
import { getAgent } from "../../../libs/agent/registry.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../libs/tools/types.js";
import type {
	AgentLucidToolName,
	MediaGenerationType,
	MediaOrigin,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import downloadGeneratedMedia from "../../ai/helpers/download-generated-media.js";
import uploadSingle from "../../media/upload-single.js";
import register from "../references/register.js";
import generatedMediaNote from "./generated-media-note.js";
import type { generatedMediaOutputSchema } from "./generated-media-schema.js";

/** Saves personal or library media, links it to the chat, and returns the tool output and preview. */
const saveGeneratedMedia: ServiceFn<
	[
		{
			toolName: AgentLucidToolName;
			/** What was generated, for the agent's note. */
			noun: MediaGenerationType;
			execution: AgentToolExecution;
			library: boolean;
			requestId: string;
			origin: Extract<MediaOrigin, "ai_generated" | "ai_modified">;
			file: {
				id: string;
				storageKey: string;
				mimeType: string;
				extension: string;
			};
			title: string;
			alt?: string;
		},
	],
	Omit<AgentToolResult<z.output<typeof generatedMediaOutputSchema>>, "summary">
> = async (context, props) => {
	const { execution } = props;
	const { principal } = execution.authority;

	const bytes = await downloadGeneratedMedia(context, {
		storageKey: props.file.storageKey,
		signal: execution.signal,
	});
	if (bytes.error) return bytes;

	const ownerUserId = props.library
		? null
		: principal.type === "user"
			? principal.userId
			: null;
	const locale = context.config.localization.defaultLocale;
	const translation = (value?: string) =>
		value === undefined ? undefined : [{ localeCode: locale, value }];
	const fileName = `${props.file.id}.${props.file.extension}`;

	const saved = await uploadSingle(context, {
		userId: principal.type === "user" ? principal.userId : null,
		ownerUserId,
		public: ownerUserId === null,
		origin: props.origin,
		aiGenerationRequestId: props.requestId,
		title: translation(props.title),
		alt: translation(props.alt),
		file: { fileName, mimeType: props.file.mimeType, body: bytes.data },
	});
	if (saved.error) return saved;

	const mediaId = saved.data.id;
	const linked = await register(context, {
		conversationId: execution.run.conversationId,
		references: [{ type: "media", mediaId }],
		source: { type: "tool", toolName: props.toolName },
	});
	if (linked.error) return linked;

	return {
		error: undefined,
		data: {
			output: {
				media: {
					id: mediaId,
					fileName,
					mimeType: props.file.mimeType,
					personal: ownerUserId !== null,
				},
				requestId: props.requestId,
				note: generatedMediaNote({
					noun: props.noun,
					library: ownerUserId === null,
					canAddToLibrary:
						getAgent(context.config, execution.run.agentKey)?.features.media
							.upload ?? false,
					onDocument: execution.screen?.type === "document",
				}),
			},
			widgets: [
				{
					key: constants.agent.widgets.previewMedia,
					version: 1,
					data: { mediaIds: [mediaId] },
				},
			],
			changes: [{ type: "media", mediaId }],
		},
	};
};

export default saveGeneratedMedia;
