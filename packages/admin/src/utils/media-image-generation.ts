import type {
	MediaImageGenerateCompletionResponse,
	MediaImageGenerateResponse,
} from "@types";
import type {
	MediaImageGenerationOutputFormat,
	MediaImageGenerationQuality,
	MediaImageGenerationSize,
} from "@/services/api/ai/useMediaImageGenerate";
import type { AiImageSource } from "@/store/aiModalsStore";

export type SupportedImageMimeType = "image/webp" | "image/png" | "image/jpeg";

export type GenerateValues = {
	instruction?: string;
	guidance?: MediaImageGenerationGuidanceKey;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
};

export type GenerateOptions = {
	source?: MediaImageGenerationSource;
	previousInstructions?: string[];
	includeInPreviousInstructions?: boolean;
};

export type MediaImageGenerationSource = {
	id: string;
	type: "target" | "upload" | "generation";
	label: string;
	image: AiImageSource;
};

export type MediaImageGenerationPresetSize = Exclude<
	MediaImageGenerationSize,
	[number, number]
>;

export type MediaImageGenerationResolutionPreset =
	| "custom"
	| MediaImageGenerationPresetSize;

export const resolutionPresets: Array<{
	value: MediaImageGenerationResolutionPreset;
	label: string;
	width?: number;
	height?: number;
}> = [
	{
		value: "custom",
		label: "ai.media.image.generate.resolution.option.custom",
	},
	{
		value: "1024x1024",
		label: "ai.media.image.generate.size.option.square",
		width: 1024,
		height: 1024,
	},
	{
		value: "1536x1024",
		label: "ai.media.image.generate.size.option.landscape",
		width: 1536,
		height: 1024,
	},
	{
		value: "1024x1536",
		label: "ai.media.image.generate.size.option.portrait",
		width: 1024,
		height: 1536,
	},
	{
		value: "2048x1152",
		label: "ai.media.image.generate.size.option.wide",
		width: 2048,
		height: 1152,
	},
	{
		value: "2048x2048",
		label: "ai.media.image.generate.size.option.square.large",
		width: 2048,
		height: 2048,
	},
	{
		value: "3840x2160",
		label: "ai.media.image.generate.size.option.large.wide",
		width: 3840,
		height: 2160,
	},
	{
		value: "2160x3840",
		label: "ai.media.image.generate.size.option.large.portrait",
		width: 2160,
		height: 3840,
	},
	{
		value: "auto",
		label: "ai.media.image.generate.size.option.auto",
	},
];

export const imageGuidanceOptions = [
	{
		key: "natural",
		label: "ai.media.image.generate.guidance.option.natural",
	},
	{
		key: "editorial",
		label: "ai.media.image.generate.guidance.option.editorial",
	},
	{
		key: "product",
		label: "ai.media.image.generate.guidance.option.product",
	},
	{
		key: "illustration",
		label: "ai.media.image.generate.guidance.option.illustration",
	},
	{
		key: "cinematic",
		label: "ai.media.image.generate.guidance.option.cinematic",
	},
] as const;

export type MediaImageGenerationGuidanceKey =
	(typeof imageGuidanceOptions)[number]["key"];

export type MediaImageGenerationCandidate = {
	id: string;
	instruction: string;
	guidance?: MediaImageGenerationGuidanceKey;
	sourceLabel?: string;
	source?: MediaImageGenerationSource;
	previousInstructions: string[];
	includeInPreviousInstructions: boolean;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
	cost: MediaImageGenerateCompletionResponse["usage"]["cost"];
	output: MediaImageGenerateCompletionResponse["output"];
};

export type PendingMediaImageGeneration = {
	id: string;
	requestId: string;
	idempotencyKey: string;
	targetId: string;
	instruction: string;
	guidance?: MediaImageGenerationGuidanceKey;
	sourceLabel: string;
	source?: MediaImageGenerationSource;
	previousInstructions: string[];
	includeInPreviousInstructions: boolean;
	size: MediaImageGenerationSize;
	quality: MediaImageGenerationQuality;
	outputFormat: MediaImageGenerationOutputFormat;
	status: MediaImageGenerateResponse["status"];
	createdAt: number;
	storageKey: string;
};

type StoredPendingMediaImageGeneration = Omit<
	PendingMediaImageGeneration,
	"source" | "storageKey"
> & {
	expiresAt: number;
};

const pendingGenerationStoragePrefix = "lucid-ai-media-image-generation";
const pendingGenerationStorageTtlMs = 60 * 60 * 1000;

export const initialCompletionPollDelayMs = 20_000;
export const steadyCompletionPollDelayMs = 10_000;
export const steadyCompletionPollAfterMs = 60_000;

/**
 * Builds a stable download filename from the generated image metadata.
 */
export function generationFileName(
	output: MediaImageGenerateCompletionResponse["output"],
) {
	const extension = output.extension || output.outputFormat || "webp";
	return `${output.id}.${extension.replace(/^\./, "")}`;
}

/**
 * Keeps each target's pending generation isolated in session storage.
 */
export function getPendingMediaImageGenerationStorageKey(targetId?: string) {
	return targetId ? `${pendingGenerationStoragePrefix}-${targetId}` : undefined;
}

/**
 * Checks that restored session data has the minimum shape needed to resume.
 */
function isStoredPendingGeneration(
	value: unknown,
): value is StoredPendingMediaImageGeneration {
	if (!value || typeof value !== "object") return false;

	const pending = value as Partial<StoredPendingMediaImageGeneration>;
	const hasValidSize =
		typeof pending.size === "string" ||
		(Array.isArray(pending.size) &&
			pending.size.length === 2 &&
			pending.size.every((value) => typeof value === "number"));

	return (
		typeof pending.id === "string" &&
		typeof pending.requestId === "string" &&
		typeof pending.idempotencyKey === "string" &&
		typeof pending.targetId === "string" &&
		typeof pending.sourceLabel === "string" &&
		typeof pending.instruction === "string" &&
		(pending.guidance === undefined || typeof pending.guidance === "string") &&
		Array.isArray(pending.previousInstructions) &&
		pending.previousInstructions.every(
			(instruction) => typeof instruction === "string",
		) &&
		typeof pending.includeInPreviousInstructions === "boolean" &&
		hasValidSize &&
		typeof pending.quality === "string" &&
		typeof pending.outputFormat === "string" &&
		typeof pending.status === "string" &&
		typeof pending.createdAt === "number" &&
		typeof pending.expiresAt === "number"
	);
}

/**
 * Restores a pending generation so users can resume polling after reopening.
 */
export function loadStoredPendingMediaImageGeneration(targetId?: string) {
	const storageKey = getPendingMediaImageGenerationStorageKey(targetId);
	if (!storageKey) return undefined;

	try {
		const raw = sessionStorage.getItem(storageKey);
		if (!raw) return undefined;

		const parsed = JSON.parse(raw) as unknown;
		if (!isStoredPendingGeneration(parsed) || parsed.expiresAt <= Date.now()) {
			sessionStorage.removeItem(storageKey);
			return undefined;
		}

		return {
			...parsed,
			storageKey,
		} satisfies PendingMediaImageGeneration;
	} catch (_error) {
		sessionStorage.removeItem(storageKey);
		return undefined;
	}
}

/**
 * Saves enough local UI context to show and resume an in-flight generation.
 */
export function storePendingMediaImageGeneration(
	pending: PendingMediaImageGeneration,
) {
	try {
		const stored: StoredPendingMediaImageGeneration = {
			id: pending.id,
			requestId: pending.requestId,
			idempotencyKey: pending.idempotencyKey,
			targetId: pending.targetId,
			instruction: pending.instruction,
			guidance: pending.guidance,
			sourceLabel: pending.sourceLabel,
			previousInstructions: pending.previousInstructions,
			includeInPreviousInstructions: pending.includeInPreviousInstructions,
			size: pending.size,
			quality: pending.quality,
			outputFormat: pending.outputFormat,
			status: pending.status,
			createdAt: pending.createdAt,
			expiresAt: pending.createdAt + pendingGenerationStorageTtlMs,
		};

		sessionStorage.setItem(pending.storageKey, JSON.stringify(stored));
	} catch (_error) {
		return;
	}
}

/**
 * Clears resume data once a generation completes, fails, or is discarded.
 */
export function clearStoredPendingMediaImageGeneration(
	pending?: PendingMediaImageGeneration,
	targetId?: string,
) {
	const storageKey =
		pending?.storageKey ?? getPendingMediaImageGenerationStorageKey(targetId);
	if (!storageKey) return;

	try {
		sessionStorage.removeItem(storageKey);
	} catch (_error) {
		return;
	}
}
