// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingMediaGeneration } from "../types";
import {
	getPendingMediaGenerationStorageKey,
	loadStoredPendingMediaGeneration,
	storePendingMediaGeneration,
} from "./pending-generation";

const storageKey = getPendingMediaGenerationStorageKey("target") ?? "";

const settings = {
	type: "image" as const,
	model: "image-model",
	modelName: "Image model",
	instruction: "A lighthouse at dusk",
	sourceLabel: "photo.png",
	previousInstructions: [],
	includeInPreviousInstructions: true,
	aspectRatio: "1:1",
	resolution: "1K",
	quality: null,
	outputFormat: "webp",
};

const pending: PendingMediaGeneration = {
	id: "generation-2",
	settings: {
		...settings,
		source: {
			id: "upload-source",
			type: "upload",
			label: "photo.png",
			image: { url: "https://example.com/photo.png" },
		},
	},
	requestId: "request",
	idempotencyKey: "key",
	targetId: "target",
	status: "processing",
	createdAt: Date.now(),
	storageKey,
};

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe("pending media generations", () => {
	it("restores a stored generation without its source file", () => {
		storePendingMediaGeneration(pending);

		const restored = loadStoredPendingMediaGeneration("target");
		expect(restored).toMatchObject({ ...pending, settings });
		expect(restored?.settings).not.toHaveProperty("source");
		expect(loadStoredPendingMediaGeneration("other")).toBeUndefined();
	});

	it("drops stored data without the shape needed to resume", () => {
		sessionStorage.setItem(
			storageKey,
			JSON.stringify({ ...pending, settings: { type: "video" } }),
		);

		expect(loadStoredPendingMediaGeneration("target")).toBeUndefined();
		expect(sessionStorage.getItem(storageKey)).toBeNull();
	});

	it("drops a generation once it expires", () => {
		storePendingMediaGeneration(pending);
		vi.useFakeTimers();
		vi.setSystemTime(pending.createdAt + 60 * 60 * 1000);

		expect(loadStoredPendingMediaGeneration("target")).toBeUndefined();
		expect(sessionStorage.getItem(storageKey)).toBeNull();
	});
});
