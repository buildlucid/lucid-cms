import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMediaModelOptions from "../../../ai/features/get-media-model-options.js";
import checkMediaLibrary from "../../helpers/check-media-library.js";
import generateAgentMedia from "../../helpers/generate-agent-media.js";
import paidToolError from "../../helpers/paid-tool-error.js";
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
	if (catalog.error) {
		return { data: undefined, error: paidToolError(catalog.error) };
	}

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
	const saved = await generateAgentMedia(context, {
		toolName: generateAudioToolName,
		request: {
			feature: { key: "media.audio.generate", version: "v1" },
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
			generation: { model: model.id, voice },
		},
		timeoutMs: GENERATE_AUDIO_TIMEOUT_MS,
		execution,
		library: library.data,
		origin: "ai_generated",
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
