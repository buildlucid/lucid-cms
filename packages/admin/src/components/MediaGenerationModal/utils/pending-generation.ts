import { isObjectRecord } from "@/utils/type-guards";
import type { MediaGenerationSettings, PendingMediaGeneration } from "../types";

type StoredPendingMediaGeneration = Omit<
	PendingMediaGeneration,
	"settings" | "storageKey"
> & {
	//* source files can't be stored, so a resumed image only keeps its label
	settings: MediaGenerationSettings & { source?: never };
	expiresAt: number;
};

const pendingGenerationStoragePrefix = "lucid-ai-media-generation";
const pendingGenerationStorageTtlMs = 60 * 60 * 1000;

export const initialCompletionPollDelayMs = 20_000;
export const steadyCompletionPollDelayMs = 10_000;
export const steadyCompletionPollAfterMs = 60_000;

/** Keeps each target's pending generation isolated in session storage. */
export function getPendingMediaGenerationStorageKey(targetId?: string) {
	return targetId ? `${pendingGenerationStoragePrefix}-${targetId}` : undefined;
}

/** Checks that restored session data has the minimum shape needed to resume. */
function isStoredPendingGeneration(
	value: unknown,
): value is StoredPendingMediaGeneration {
	if (!isObjectRecord(value) || !isObjectRecord(value.settings)) return false;

	const { settings } = value;
	const settingsValid =
		settings.type === "image"
			? typeof settings.instruction === "string" &&
				typeof settings.sourceLabel === "string" &&
				Array.isArray(settings.previousInstructions) &&
				typeof settings.aspectRatio === "string"
			: settings.type === "audio" &&
				typeof settings.script === "string" &&
				typeof settings.voice === "string" &&
				typeof settings.voiceName === "string";

	return (
		settingsValid &&
		typeof settings.model === "string" &&
		typeof settings.modelName === "string" &&
		typeof value.id === "string" &&
		typeof value.requestId === "string" &&
		typeof value.idempotencyKey === "string" &&
		typeof value.targetId === "string" &&
		typeof value.status === "string" &&
		typeof value.createdAt === "number" &&
		typeof value.expiresAt === "number"
	);
}

/** Restores a pending generation so people can resume polling after reopening. */
export function loadStoredPendingMediaGeneration(
	targetId?: string,
): PendingMediaGeneration | undefined {
	const storageKey = getPendingMediaGenerationStorageKey(targetId);
	if (!storageKey) return undefined;

	try {
		const raw = sessionStorage.getItem(storageKey);
		if (!raw) return undefined;

		const parsed: unknown = JSON.parse(raw);
		if (!isStoredPendingGeneration(parsed) || parsed.expiresAt <= Date.now()) {
			sessionStorage.removeItem(storageKey);
			return undefined;
		}

		return { ...parsed, storageKey };
	} catch (_error) {
		sessionStorage.removeItem(storageKey);
		return undefined;
	}
}

/** Saves enough local UI context to show and resume an in-flight generation. */
export function storePendingMediaGeneration(pending: PendingMediaGeneration) {
	const settings =
		pending.settings.type === "image"
			? { ...pending.settings, source: undefined }
			: pending.settings;

	try {
		const stored: StoredPendingMediaGeneration = {
			id: pending.id,
			requestId: pending.requestId,
			idempotencyKey: pending.idempotencyKey,
			targetId: pending.targetId,
			settings,
			status: pending.status,
			createdAt: pending.createdAt,
			expiresAt: pending.createdAt + pendingGenerationStorageTtlMs,
		};

		sessionStorage.setItem(pending.storageKey, JSON.stringify(stored));
	} catch (_error) {
		return;
	}
}

/** Clears resume data once a generation completes, fails, or is discarded. */
export function clearStoredPendingMediaGeneration(
	pending?: PendingMediaGeneration,
	targetId?: string,
) {
	const storageKey =
		pending?.storageKey ?? getPendingMediaGenerationStorageKey(targetId);
	if (!storageKey) return;

	try {
		sessionStorage.removeItem(storageKey);
	} catch (_error) {
		return;
	}
}
