import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { cmsAiMediaOutputSchemas } from "../../../../libs/lucid-remote/schema/ai.js";
import generateMedia from "../../../../libs/lucid-remote/services/generate-media/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMediaModelOptions from "../../../ai/features/get-media-model-options.js";
import checkMediaLibrary from "../../helpers/check-media-library.js";
import runPaidToolRequest, {
	requestIdFor,
} from "../../helpers/run-paid-tool-request.js";
import saveGeneratedMedia from "../../helpers/save-generated-media.js";
import {
	GENERATE_AUDIO_TIMEOUT_MS,
	generateAudioToolName,
} from "./constants.js";
import type { inputSchema, outputSchema, settingsSchema } from "./schema.js";

/** Speaks a script, saves personal or library audio, and links its preview to the chat. */
const generateAudio: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			/** Reviewed settings override the agent's input. */
			settings?: z.output<typeof settingsSchema>;
			execution: AgentToolExecution;
		},
	],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, props) => {
	const { input, execution } = props;
	const catalog = await getMediaModelOptions(context, { type: "audio" });
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
		instruction: input.instruction ?? null,
		model: null,
		voice: null,
	};
	const modelId = settings.model ?? catalog.data.default;
	const model = catalog.data.models.find((option) => option.id === modelId);
	if (!model || !("voices" in model)) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.model.not.available"),
			},
		};
	}
	if (settings.script.length > model.maxCharacters) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.media.generate.script.too.long", {
					data: {
						length: settings.script.length,
						max: model.maxCharacters,
					},
				}),
			},
		};
	}

	const voice =
		model.voices.find((option) => option.id === settings.voice)?.id ??
		model.defaultVoice;
	const instruction = model.instructions ? settings.instruction : null;
	const featureKey = "media.audio.generate";
	const generated = await runPaidToolRequest(context, {
		execution,
		featureKey,
		timeoutMs: GENERATE_AUDIO_TIMEOUT_MS,
		send: (paid) =>
			generateMedia(context, {
				...paid,
				request: {
					feature: { key: featureKey, version: "v1" },
					sessionId: execution.run.conversationId,
					input: [
						{ type: "text", role: "script", value: settings.script },
						...(instruction
							? [
									{
										type: "text",
										role: "user-instruction",
										value: instruction,
									} as const,
								]
							: []),
					],
					generation: {
						model: model.id,
						voice,
					},
				},
			}),
	});
	if (generated.error) return generated;

	const output = cmsAiMediaOutputSchemas.audio.safeParse(generated.data.output);
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
		toolName: generateAudioToolName,
		noun: "audio",
		execution,
		library: library.data,
		requestId: requestIdFor(featureKey, execution.operationId),
		origin: "ai_generated",
		file: output.data,
		title: settings.title,
	});
	if (saved.error) return saved;

	return {
		error: undefined,
		data: {
			...saved.data,
			summary: copy("admin:core.tools.media_generate_audio.summary"),
		},
	};
};

export default generateAudio;
