export type AiGenerateCost = {
	currency: string;
	totalCostMinor: number;
};

export type AiGenerateMode = "sync" | "async";

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
	output: Record<string, unknown>;
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
	output: Record<string, string>;
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
