export type AiGenerateCost = {
	currency: string;
	totalCostMinor: number;
};

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
	requestId: string;
	feature: {
		key: "media.alt.generate";
		version: "v1";
	};
	output: Record<string, string>;
	usage: AiGenerateUsage;
};

export type MediaImageGenerateResponse = {
	requestId: string;
	feature: {
		key: "media.image.generate";
		version: "v1";
	};
	output: {
		id: string;
		url: string;
		urlExpiresAt: string;
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
