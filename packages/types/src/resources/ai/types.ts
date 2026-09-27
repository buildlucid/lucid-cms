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
export type AiUsageChartMetric = "requests" | "totalTokens" | "cost";

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

export type CustomFieldInputGenerateResponse = {
	mode: AiGenerateMode;
	status?: "complete";
	requestId: string;
	feature: {
		key: "custom-field.input.generate";
		version: "v1";
	};
	output: AiGeneratedContent<unknown>;
	usage: AiGenerateUsage;
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

export type MediaImageGenerateCompletionStatus = "complete";
export type MediaImageGenerateStatus = "queued" | "processing";

export type MediaImageGenerateResponse = {
	mode: "async";
	requestId: string;
	feature: {
		key: "media.image.generate";
		version: "v1";
	};
	status: MediaImageGenerateStatus;
};

export type MediaImageGenerateCompletionResponse = {
	mode: AiGenerateMode;
	status?: MediaImageGenerateCompletionStatus;
	requestId: string;
	feature: {
		key: "media.image.generate";
		version: "v1";
	};
	output: {
		id: string;
		url: string;
		storageKey: string;
		byteSize: number;
		mimeType: string;
		extension: string;
		size: string;
		quality: string;
		outputFormat: string;
	};
	usage: AiGenerateUsage;
};

export type MediaImageGenerateCompletionPollResponse =
	| MediaImageGenerateResponse
	| MediaImageGenerateCompletionResponse;

export type AiUsage = {
	id: number;
	requestId: string;
	providerRequestId: string | null;
	feature: {
		key: string;
		label: string;
		version: string;
	};
	status: AiUsageStatus;
	model: string | null;
	createdAt: string | null;
	durationMs: number | null;
	errorMessage: string | null;
	tokens: {
		input: number;
		output: number;
		total: number;
	} | null;
	cost: AiGenerateCost | null;
	target: {
		type: string;
		data: Record<string, unknown>;
	};
	user: UserRef;
};

export type AiUsageChart = {
	dimension: AiUsageChartDimension;
	metrics: AiUsageChartMetric[];
	startDate: string;
	endDate: string;
	feature: {
		key: string;
		label: string;
	} | null;
	series: Array<{
		metric: AiUsageChartMetric;
		points: Array<{
			date: string;
			value: number;
		}>;
	}>;
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
