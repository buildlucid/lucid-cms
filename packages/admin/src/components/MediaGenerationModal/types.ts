import type {
	MediaGenerateCompletionResponse,
	MediaGenerateStatus,
} from "@types";
import type { AiImageSource } from "@/store/aiModalsStore/aiModalsStore";
import type {
	ImageOptions,
	MediaImageGenerationGuidanceKey,
} from "@/utils/media-generation";

export type SupportedImageMimeType = "image/webp" | "image/png" | "image/jpeg";

export type MediaImageGenerationSource = {
	id: string;
	type: "target" | "upload" | "generation";
	label: string;
	image: AiImageSource;
};

/** Image form input, supplemented by the modal with the model, source and previous instructions. */
export type ImageGenerationValues = ImageOptions & {
	instruction: string;
	guidance?: MediaImageGenerationGuidanceKey;
};

/** Audio form input, supplemented by the modal with the model. */
export type AudioGenerationValues = {
	script: string;
	instruction?: string;
	voice: string;
};

/** Everything a generation was made with, enough to show it again or retry it. */
export type MediaGenerationSettings =
	| (ImageGenerationValues & {
			type: "image";
			model: string;
			modelName: string;
			sourceLabel: string;
			source?: MediaImageGenerationSource;
			previousInstructions: string[];
			includeInPreviousInstructions: boolean;
	  })
	| {
			type: "audio";
			model: string;
			modelName: string;
			script: string;
			instruction: string;
			voice: string;
			voiceName: string;
	  };

/** A generation being sent to Lucid. */
export type WorkingMediaGeneration = {
	id: string;
	settings: MediaGenerationSettings;
};

/** A finished generation people can preview, retry or use. */
export type MediaGenerationCandidate = WorkingMediaGeneration & {
	requestId: string;
	result: MediaGenerateCompletionResponse;
};

/** A generation Lucid accepted and is still working on, kept so it can resume after the modal closes. */
export type PendingMediaGeneration = WorkingMediaGeneration & {
	requestId: string;
	idempotencyKey: string;
	targetId: string;
	status: MediaGenerateStatus;
	createdAt: number;
	storageKey: string;
};
