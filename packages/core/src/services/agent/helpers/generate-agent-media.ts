import type { AgentLucidToolName } from "@lucidcms/types";
import type z from "zod";
import constants from "../../../constants/constants.js";
import { getAgent } from "../../../libs/agent/registry.js";
import { mediaGenerations } from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import { cmsAiMediaOutputSchemas } from "../../../libs/lucid-remote/schema/ai.js";
import type {
	MediaAudioGenerateV1Request,
	MediaImageGenerateV1Request,
} from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import runCmsAiRequest from "../../../libs/lucid-remote/services/run-cms-ai-request/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../libs/tools/types.js";
import type { MediaOrigin } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import downloadGeneratedMedia from "../../ai/helpers/download-generated-media.js";
import uploadSingle from "../../media/upload-single.js";
import register from "../references/register.js";
import generatedMediaNote from "./generated-media-note.js";
import type { generatedMediaOutputSchema } from "./generated-media-schema.js";
import runPaidToolRequest from "./run-paid-tool-request.js";

/** Generates paid personal or library media, links it to the chat, and returns tool output and a preview. */
const generateAgentMedia: ServiceFn<
	[
		{
			toolName: AgentLucidToolName;
			request: MediaImageGenerateV1Request | MediaAudioGenerateV1Request;
			timeoutMs: number;
			execution: AgentToolExecution;
			library: boolean;
			origin: Extract<MediaOrigin, "ai_generated" | "ai_modified">;
			title: string;
			alt?: string;
		},
	],
	Omit<AgentToolResult<z.output<typeof generatedMediaOutputSchema>>, "summary">
> = async (context, props) => {
	const { execution, request } = props;
	const { principal } = execution.authority;
	const { type } = mediaGenerations[request.feature.key];

	const generated = await runPaidToolRequest(context, {
		execution,
		featureKey: request.feature.key,
		timeoutMs: props.timeoutMs,
		send: (paid) =>
			runCmsAiRequest(context, { ...paid, request, pollMs: 5_000 }),
	});
	if (generated.error) return generated;

	const file = cmsAiMediaOutputSchemas[type].safeParse(generated.data.output);
	if (!file.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:agent.media.generate.failed"),
			},
		};
	}

	const bytes = await downloadGeneratedMedia(context, {
		storageKey: file.data.storageKey,
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
	const fileName = `${file.data.id}.${file.data.extension}`;

	const saved = await uploadSingle(context, {
		actor: { type: "internal" },
		userId: principal.type === "user" ? principal.userId : null,
		ownerUserId,
		public: ownerUserId === null,
		origin: props.origin,
		aiGenerationRequestId: generated.data.requestId,
		title: translation(props.title),
		alt: translation(props.alt),
		file: { fileName, mimeType: file.data.mimeType, body: bytes.data },
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
					mimeType: file.data.mimeType,
					personal: ownerUserId !== null,
				},
				requestId: generated.data.requestId,
				note: generatedMediaNote({
					noun: type,
					library: ownerUserId === null,
					canAddToLibrary:
						(getAgent(context.config, execution.run.agentKey)?.features.media
							.addToLibrary ??
							false) &&
						hasPermission(execution.authority, Permissions.MediaCreate),
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

export default generateAgentMedia;
