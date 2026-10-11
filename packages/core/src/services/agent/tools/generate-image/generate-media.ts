import type z from "zod";
import constants from "../../../../constants/constants.js";
import { getAgent } from "../../../../libs/agent/registry.js";
import { copy } from "../../../../libs/i18n/index.js";
import type { AdminCopyInput } from "../../../../libs/i18n/types.js";
import type { MediaImageGenerateV1Request } from "../../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import generateImage from "../../../../libs/lucid-remote/services/generate-image/index.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasPermission from "../../../../libs/permission/has-permission.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkFeatureEnabled from "../../../ai/checks/check-feature-enabled.js";
import { imageGuidanceInstructions } from "../../../ai/helpers/image-guidance.js";
import uploadSingle from "../../../media/upload-single.js";
import runPaidToolRequest, {
	requestIdFor,
} from "../../helpers/run-paid-tool-request.js";
import register from "../../references/register.js";
import { GENERATE_IMAGE_TIMEOUT_MS } from "./constants.js";
import downloadImage from "./download-image.js";
import resolveSource from "./resolve-source.js";
import resultNote from "./result-note.js";
import {
	editableImageMimeTypeSchema,
	type inputSchema,
	type outputSchema,
	type settingsResponseSchema,
} from "./schema.js";

/**
 * Generates or edits an image, saves personal or library media, and links its preview to the chat.
 * @remarks Personal media is private by default; library requests and system runs save public library media.
 */
const generateMedia: ServiceFn<
	[
		{
			toolName: string;
			input: z.output<typeof inputSchema>;
			/** Reviewed settings override the agent's input. */
			settings?: z.output<typeof settingsResponseSchema>;
			editMediaId: number | null;
			execution: AgentToolExecution;
			summary: AdminCopyInput;
		},
	],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, props) => {
	const { input, execution } = props;
	const enabled = await checkFeatureEnabled(context, {
		feature: "imageGeneration",
	});
	if (enabled.error) return enabled;

	const { principal } = execution.authority;
	const library = input.library || principal.type === "system";
	if (
		library &&
		principal.type === "user" &&
		!hasPermission(execution.authority, Permissions.MediaCreate)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.image.generate.library.denied"),
			},
		};
	}

	const source =
		props.editMediaId === null
			? undefined
			: await resolveSource(context, {
					mediaId: props.editMediaId,
					mimeTypes: editableImageMimeTypeSchema,
					execution,
				});
	if (source?.error) return source;

	const settings = props.settings ?? input;
	const request: MediaImageGenerateV1Request = {
		feature: { key: "media.image.generate", version: "v1" },
		sessionId: execution.run.conversationId,
		input: [
			{ type: "text", role: "user-instruction", value: settings.instruction },
			...(settings.guidance
				? [
						{
							type: "text",
							role: "guidance",
							value: imageGuidanceInstructions[settings.guidance],
						} as const,
					]
				: []),
			...(source
				? [{ type: "image", role: "source-image", image: source.data } as const]
				: []),
		],
		context: {},
		generation: {
			size: settings.size,
			quality: settings.quality,
			outputFormat: settings.outputFormat,
		},
	};
	const featureKey = "media.image.generate";
	const generated = await runPaidToolRequest(context, {
		execution,
		featureKey,
		timeoutMs: GENERATE_IMAGE_TIMEOUT_MS,
		send: (paid) => generateImage(context, { ...paid, request }),
	});
	if (generated.error) return generated;
	const requestId = requestIdFor(featureKey, execution.operationId);

	const { output } = generated.data;
	const image = await downloadImage(context, {
		storageKey: output.storageKey,
		signal: execution.signal,
	});
	if (image.error) return image;

	const ownerUserId = library
		? null
		: principal.type === "user"
			? principal.userId
			: null;
	const locale = context.config.localization.defaultLocale;
	const translation = (value: string) => [{ localeCode: locale, value }];
	const fileName = `${output.id}.${output.extension || output.outputFormat}`;

	const saved = await uploadSingle(context, {
		userId: principal.type === "user" ? principal.userId : null,
		ownerUserId,
		public: ownerUserId === null,
		origin: source ? "ai_modified" : "ai_generated",
		aiGenerationRequestId: requestId,
		title: translation(settings.title),
		alt: translation(settings.alt ?? settings.title),
		file: { fileName, mimeType: output.mimeType, body: image.data },
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
					mimeType: output.mimeType,
					personal: ownerUserId !== null,
				},
				requestId,
				note: resultNote({
					library: ownerUserId === null,
					canAddToLibrary:
						getAgent(context.config, execution.run.agentKey)?.features.media
							.upload ?? false,
					onDocument: execution.screen?.type === "document",
				}),
			},
			summary: props.summary,
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

export default generateMedia;
