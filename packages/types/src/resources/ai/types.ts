export type AiGeneratedContent<T> =
	| { kind: "value"; value: T }
	| { kind: "translations"; translations: Record<string, T> };

import type { UserRef } from "../users/types.js";

export type AiGenerateCost = {
	creditsCharged: string;
};

export type AiGenerateMode = "sync" | "async";
export type AiUsageStatus = "failed" | "pending" | "success";
export type AiUsageChartDimension = "day";
export type AiUsageChartMetric = "requests" | "totalTokens" | "credits";

export type AiGenerateUsage = {
	model: string;
	providerRequestId?: string;
	tokens: {
		input: {
			text: number;
			image: number;
			audio: number;
			cached: {
				total: number;
				text: number;
				image: number;
				audio: number;
			};
			total: number;
		};
		output: {
			text: number;
			image: number;
			audio: number;
			reasoning: number;
			acceptedPrediction: number;
			rejectedPrediction: number;
			total: number;
		};
		total: number;
	};
	cost: AiGenerateCost;
};

export type MediaAltGenerateResponse = {
	mode: AiGenerateMode;
	status?: "complete";
	requestId: string;
	feature: {
		key: "media.alt.generate";
		version: "v1";
	};
	output: AiGeneratedContent<string>;
	usage: AiGenerateUsage;
};

/** The media types Lucid can generate. */
export type MediaGenerationType = "image" | "audio";

/** AI features the CMS config turns on or off. */
export type AiFeature =
	| "chatRename"
	| "altGeneration"
	| `${MediaGenerationType}Generation`
	| "agents"
	| "mcp";

/** The Lucid feature behind each media type. */
export type MediaGenerateFeatures = {
	image: { key: "media.image.generate"; version: "v1" };
	audio: { key: "media.audio.generate"; version: "v1" };
};

export type MediaGenerateStatus = "queued" | "processing";

/** A pending media generation whose `type` identifies its feature. */
export type MediaGenerateResponse = {
	[Type in MediaGenerationType]: {
		mode: "async";
		requestId: string;
		type: Type;
		feature: MediaGenerateFeatures[Type];
		status: MediaGenerateStatus;
	};
}[MediaGenerationType];

type GeneratedMediaFile = {
	id: string;
	/** A CMS URL that streams the file for previews, until it is saved. */
	url: string;
	storageKey: string;
	byteSize: number;
	mimeType: string;
	extension: string;
};

/** Each media type's generated file and the settings it was made with. */
export type MediaGenerateOutputs = {
	image: GeneratedMediaFile & {
		aspectRatio: string;
		/** Null when the model picked its own resolution. */
		resolution: string | null;
		/** Null when the model has no quality setting. */
		quality: string | null;
	};
	audio: GeneratedMediaFile & {
		voice: string;
		/** How many characters were spoken. */
		characters: number;
	};
};

/** A finished media generation whose `type` identifies its output. */
export type MediaGenerateCompletionResponse = {
	[Type in MediaGenerationType]: {
		mode: AiGenerateMode;
		status?: "complete";
		requestId: string;
		feature: MediaGenerateFeatures[Type];
		usage: AiGenerateUsage;
		type: Type;
		output: MediaGenerateOutputs[Type];
	};
}[MediaGenerationType];

export type MediaGenerateCompletionPollResponse =
	| MediaGenerateResponse
	| MediaGenerateCompletionResponse;

/** A generated file copied into media storage, ready to create or replace media with its key. */
export type SavedGeneratedMedia = {
	key: string;
	fileName: string;
	mimeType: string;
	size: number;
};

/** A voice a speech model can speak with. */
export type MediaGenerationVoice = {
	id: string;
	name: string;
	/** A BCP 47 tag, for voices made for one language. */
	language?: string;
	/** A short sample recording of the voice. */
	previewUrl: string;
};

/** The models each media type can generate with, and the options each supports. */
export type MediaGenerationModels = {
	image: {
		id: string;
		name: string;
		description: string;
		aspectRatios: string[];
		/** Empty when the model picks its own resolution. */
		resolutions: string[];
		/** Empty when the model has no quality setting. */
		qualities: string[];
		/** Empty when the model returns its own format. */
		outputFormats: string[];
		/** Takes a source image to edit. */
		sourceImage: boolean;
	};
	audio: {
		id: string;
		name: string;
		description: string;
		/** Audio output format. */
		format: string;
		voices: MediaGenerationVoice[];
		defaultVoice: string;
		/** Takes delivery instructions, such as tone and pacing. */
		instructions: boolean;
		/** The longest script one request can speak. */
		maxCharacters: number;
	};
};

/** The models people can pick for a media type, and the one used by default. */
export type MediaModelCatalog<Type extends MediaGenerationType> = {
	default: string;
	models: MediaGenerationModels[Type][];
};

/** Lucid AI features that record usage. */
export type AiUsageFeatureKey =
	| "agent.chat"
	| "agent.compact"
	| "agent.title.generate"
	| "web.search"
	| "web.fetch"
	| "media.analyze"
	| "media.alt.generate"
	| MediaGenerateFeatures[MediaGenerationType]["key"];

/** What a usage session was for. Agent sessions are chats, including routine runs. */
export type AiUsageSessionType =
	| "agent"
	| "media-alt"
	| `media-${MediaGenerationType}`;

export type AiUsageTokens = {
	input: number;
	output: number;
	total: number;
};

export type AiUsageMeasure =
	| {
			kind: "model";
			model: string;
			tokens: AiUsageTokens;
	  }
	| {
			kind: "web";
			operation: "search" | "fetch";
			requests: number;
	  };

export type AiUsageRecord = {
	id: number;
	requestId: string;
	providerRequestId: string | null;
	feature: {
		key: string;
		version: string;
	};
	status: AiUsageStatus;
	/** The agent run the request belongs to, while that run exists. */
	runId: string | null;
	/** Null until Lucid reports usage, and for failures that were not charged. */
	usage: AiUsageMeasure | null;
	credits: number | null;
	durationMs: number | null;
	errorMessage: string | null;
	createdAt: string | null;
};

/** Requests made together, such as one agent chat or one media generation modal. */
export type AiUsageSession = {
	type: AiUsageSessionType;
	id: string;
	/** The chat an agent session belongs to, when the viewer can open it. */
	conversation: {
		id: string;
		title: string;
	} | null;
	user: UserRef;
	credits: number;
	tokens: AiUsageTokens;
	requests: {
		total: number;
		webSearches: number;
		webFetches: number;
		failed: number;
		pending: number;
	};
	startedAt: string | null;
	lastActivityAt: string | null;
};

export type AiUsageChart = {
	dimension: AiUsageChartDimension;
	metrics: AiUsageChartMetric[];
	startDate: string;
	endDate: string;
	series: Array<{
		metric: AiUsageChartMetric;
		points: Array<{
			date: string;
			value: number;
		}>;
	}>;
	totals: {
		credits: number;
		totalTokens: number;
		requests: number;
		sessions: number;
	};
};

export type AiCredits = {
	/** What can be spent now, including any monthly cap on the connection. */
	available: number;
	/** The subscription allowance for the current period. Null without an active subscription. */
	allowance: {
		total: number;
		used: number;
		remaining: number;
		resetsAt: string;
	} | null;
	/** Purchased and granted credits. These do not reset. */
	additional: {
		remaining: number;
	};
	/** The monthly spend cap on this connection. Null when uncapped. */
	connectionCap: {
		limit: number;
		used: number;
		remaining: number;
		resetsAt: string;
	} | null;
};

/** Reasoning efforts agents can use. Each model lists the ones it supports; models without reasoning list none. */
export type AiReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh";

/** A model choice. Leave out the effort to use the model's default. */
export type AiModelSelection = {
	/** A model ID from the Lucid service, such as `"openai/gpt-6-luna"`. */
	modelId: string;
	reasoningEffort?: AiReasoningEffort | null;
};

export type AiModel = {
	id: string;
	name: string;
	description: string;
	/** Input budget Lucid uses to decide when to compact conversation history. */
	inputTokenLimit: number;
	/** Hosted prompt overhead, included only when provider usage has not measured it. */
	instructionTokens?: number;
	/** The most tools one request to this model can offer, including Lucid's own. */
	toolLimit: number;
	reasoningEfforts: AiReasoningEffort[];
	defaultReasoningEffort: AiReasoningEffort | null;
};

export type AiModelCatalog = {
	default: Required<AiModelSelection>;
	models: AiModel[];
};

export type AiModelConfig = {
	/** Used when nothing more specific is chosen. Falls back to an available default when it is not offered. */
	default?: AiModelSelection;
	/** Model IDs to offer. Leave out to offer every model the Lucid service provides. */
	available?: readonly string[];
};
