import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { AdminCopyInput } from "../../../../libs/i18n/types.js";
import { cmsAiMediaOutputSchemas } from "../../../../libs/lucid-remote/schema/ai.js";
import type { MediaImageGenerateV1Request } from "../../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import generateMedia from "../../../../libs/lucid-remote/services/generate-media/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMediaModelOptions from "../../../ai/features/get-media-model-options.js";
import { imageGuidanceInstructions } from "../../../ai/helpers/image-guidance.js";
import checkMediaLibrary from "../../helpers/check-media-library.js";
import runPaidToolRequest, {
	requestIdFor,
} from "../../helpers/run-paid-tool-request.js";
import saveGeneratedMedia from "../../helpers/save-generated-media.js";
import {
	type editImageToolName,
	GENERATE_IMAGE_TIMEOUT_MS,
	type generateImageToolName,
} from "./constants.js";
import resolveSource from "./resolve-source.js";
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
const generateImage: ServiceFn<
	[
		{
			toolName: typeof generateImageToolName | typeof editImageToolName;
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
	const catalog = await getMediaModelOptions(context, { type: "image" });
	//* Give local organisation denials the same stop instructions as remote denials.
	if (catalog.error?.key === "ai_feature_disabled") {
		return {
			data: undefined,
			error: {
				...catalog.error,
				status: 424,
				message: copy("server:agent.tool.feature.disabled"),
			},
		};
	}
	if (catalog.error) return catalog;

	const library = await checkMediaLibrary(context, {
		library: input.library,
		execution,
	});
	if (library.error) return library;

	const settings = props.settings ?? {
		...input,
		resolution: input.resolution ?? null,
		quality: null,
		outputFormat: null,
		model: null,
	};
	const editing = props.editMediaId !== null;
	const images = catalog.data.models.flatMap((option) =>
		"aspectRatios" in option ? [option] : [],
	);
	const picked = images.find(
		(option) => option.id === (settings.model ?? catalog.data.default),
	);
	//* edits without a chosen model fall back to the first model that takes a source image
	const model =
		editing && settings.model === null && !picked?.sourceImage
			? (images.find((option) => option.sourceImage) ?? picked)
			: picked;
	if (!model) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.model.not.available"),
			},
		};
	}
	if (editing && !model.sourceImage) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.media.generate.source.unsupported"),
			},
		};
	}
	const supported = (options: string[], ...values: (string | null)[]) =>
		values.find((value) => value !== null && options.includes(value)) ??
		undefined;

	const source =
		props.editMediaId === null
			? undefined
			: await resolveSource(context, {
					mediaId: props.editMediaId,
					mimeTypes: editableImageMimeTypeSchema,
					execution,
				});
	if (source?.error) return source;

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
			model: model.id,
			aspectRatio:
				supported(model.aspectRatios, settings.aspectRatio) ??
				model.aspectRatios[0] ??
				"auto",
			resolution: supported(model.resolutions, settings.resolution),
			quality: supported(model.qualities, settings.quality, "auto"),
			outputFormat: supported(
				model.outputFormats,
				settings.outputFormat,
				"webp",
			),
		},
	};
	const featureKey = "media.image.generate";
	const generated = await runPaidToolRequest(context, {
		execution,
		featureKey,
		timeoutMs: GENERATE_IMAGE_TIMEOUT_MS,
		send: (paid) => generateMedia(context, { ...paid, request }),
	});
	if (generated.error) return generated;

	const output = cmsAiMediaOutputSchemas.image.safeParse(generated.data.output);
	if (!output.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:agent.media.generate.failed"),
			},
		};
	}

	const saved = await saveGeneratedMedia(context, {
		toolName: props.toolName,
		noun: "image",
		execution,
		library: library.data,
		requestId: requestIdFor(featureKey, execution.operationId),
		origin: source ? "ai_modified" : "ai_generated",
		file: output.data,
		title: settings.title,
		alt: settings.alt ?? settings.title,
	});
	if (saved.error) return saved;

	return {
		error: undefined,
		data: { ...saved.data, summary: props.summary },
	};
};

export default generateImage;
