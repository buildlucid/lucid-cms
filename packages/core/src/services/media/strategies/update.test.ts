import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStorage: vi.fn(),
	checkCanStoreMedia: vi.fn(),
	adjustInt: vi.fn(),
	detectStreamMimeType: vi.fn(),
}));

vi.mock("../../options/adjust-int.js", () => ({
	default: mocks.adjustInt,
}));

vi.mock("../checks/check-can-store-media.js", () => ({
	default: mocks.checkCanStoreMedia,
}));

vi.mock("../checks/check-has-media-storage.js", () => ({
	default: mocks.checkHasMediaStorage,
}));

vi.mock("../helpers/detect-stream-mime-type.js", () => ({
	default: mocks.detectStreamMimeType,
}));

import update from "./update.js";

const afterRollback = vi.fn();
const context = {
	config: { media: { limits: { storageBytes: false } } },
	db: { afterRollback },
} as never;

/** Storage holding one uploaded image, which reports `etag` for each key it's asked about. */
const storageWith = (etags: Record<string, string>) => {
	const storage = {
		getMeta: vi.fn(async (_context: unknown, props: { key: string }) => ({
			error: undefined,
			data: {
				size: 42,
				mimeType: "image/png",
				etag: etags[props.key] ?? null,
				status: "ready",
			},
		})),
		rename: vi.fn().mockResolvedValue({ error: undefined, data: undefined }),
		delete: vi.fn().mockResolvedValue({ error: undefined, data: undefined }),
	};
	mocks.checkHasMediaStorage.mockResolvedValue({
		error: undefined,
		data: storage,
	});
	mocks.checkCanStoreMedia.mockResolvedValue({
		error: undefined,
		data: undefined,
	});
	mocks.adjustInt.mockResolvedValue({
		error: undefined,
		data: { applied: true },
	});
	return storage;
};

describe("media update strategy", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("moves an upload under the media's visibility, leaving the old file alone", async () => {
		const storage = storageWith({
			"public/upload": "upload-etag",
			"private/upload": "moved-etag",
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("image/png");

		const response = await update(context, {
			key: "public/upload",
			fileName: "replacement.png",
			public: false,
			replaces: { size: 24, type: "image" },
		});

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			key: "private/upload",
			etag: "moved-etag",
		});
		expect(storage.rename).toHaveBeenCalledWith(expect.any(Object), {
			from: "public/upload",
			to: "private/upload",
		});
		expect(storage.delete).not.toHaveBeenCalled();
		//* the file moves back if the change it was moved for isn't saved
		await afterRollback.mock.calls[0]?.[0]();
		expect(storage.rename).toHaveBeenLastCalledWith(expect.any(Object), {
			from: "private/upload",
			to: "public/upload",
		});
		//* only the difference in size is counted
		expect(mocks.adjustInt).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ delta: 18 }),
		);
	});

	it("keeps an upload that already has the media's visibility where it is", async () => {
		const storage = storageWith({ "public/upload": "upload-etag" });
		mocks.detectStreamMimeType.mockResolvedValueOnce("image/png");

		const response = await update(context, {
			key: "public/upload",
			fileName: "replacement.png",
			public: true,
			replaces: { size: 42, type: "image" },
		});

		expect(response.data?.key).toBe("public/upload");
		expect(storage.rename).not.toHaveBeenCalled();
	});

	it("refuses and deletes an upload that changes the media's type", async () => {
		const storage = storageWith({});
		mocks.detectStreamMimeType.mockResolvedValueOnce("video/mp4");

		const response = await update(context, {
			key: "public/upload",
			fileName: "replacement.mp4",
			public: true,
			replaces: { size: 24, type: "image" },
		});

		expect(response.error?.status).toBe(400);
		expect(storage.delete).toHaveBeenCalledWith(expect.any(Object), {
			key: "public/upload",
		});
	});
});
