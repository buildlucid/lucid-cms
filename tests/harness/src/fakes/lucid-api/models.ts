/** The agent models the fake offers. `small` has a tiny context, for compaction tests. */
export const AGENT_MODELS = {
	standard: {
		id: "harness/standard",
		name: "Harness Standard",
		description: "Answers from the test's script.",
		inputTokenLimit: 128_000,
		toolLimit: 128,
		reasoningEfforts: ["low", "high"],
		defaultReasoningEffort: "low",
	},
	//* the harness agent's instructions and tools take about 16,000 tokens, so a few long messages fill it
	small: {
		id: "harness/small",
		name: "Harness Small",
		description: "A short context, so chats compact quickly.",
		inputTokenLimit: 24_000,
		toolLimit: 128,
		reasoningEfforts: [],
		defaultReasoningEffort: null,
	},
} as const;

export const AGENT_CATALOGUE = {
	default: {
		modelId: AGENT_MODELS.standard.id,
		reasoningEffort: AGENT_MODELS.standard.defaultReasoningEffort,
	},
	models: Object.values(AGENT_MODELS),
};

/** The image and audio models, with the options the CMS offers people. */
export const MEDIA_CATALOGUES = {
	image: {
		default: "harness/image",
		models: [
			{
				id: "harness/image",
				name: "Harness Image",
				description: "A small solid colour image.",
				aspectRatios: ["1:1", "16:9"],
				resolutions: ["1K"],
				qualities: ["standard"],
				outputFormats: ["png"],
				sourceImage: true,
			},
		],
	},
	audio: {
		default: "harness/audio",
		models: [
			{
				id: "harness/audio",
				name: "Harness Audio",
				description: "A short silent recording.",
				format: "wav",
				voices: [
					{
						id: "harness-voice",
						name: "Harness Voice",
						language: "en",
						previewUrl: "https://example.com/harness-voice.wav",
					},
				],
				defaultVoice: "harness-voice",
				instructions: true,
				maxCharacters: 4_000,
			},
		],
	},
} as const;

/** The input limit the model reports, falling back to the default model's. */
export const modelFor = (modelId: string | undefined) =>
	Object.values(AGENT_MODELS).find((model) => model.id === modelId) ??
	AGENT_MODELS.standard;
