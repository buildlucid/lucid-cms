import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStorage: vi.fn(),
	checkCanUpdateMedia: vi.fn(),
	adjustInt: vi.fn(),
	detectStreamMimeType: vi.fn(),
}));

vi.mock("../../options/adjust-int.js", () => ({
	default: mocks.adjustInt,
}));

vi.mock("../checks/check-can-update-media.js", () => ({
	default: mocks.checkCanUpdateMedia,
}));

vi.mock("../checks/check-has-media-storage.js", () => ({
	default: mocks.checkHasMediaStorage,
}));

vi.mock("../helpers/detect-stream-mime-type.js", () => ({
	default: mocks.detectStreamMimeType,
}));

import update from "./update.js";

describe("media update strategy", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("uses the promoted target metadata etag for in-place replacements", async () => {
		const stream = vi.fn().mockResolvedValue({
			error: undefined,
			data: {
				body: Buffer.from("replacement-image"),
			},
		});
		const upload = vi.fn().mockResolvedValue({
			error: undefined,
			data: {
				etag: "upload-etag",
			},
		});
		const deleteObject = vi.fn().mockResolvedValue({
			error: {
				type: "plugin",
				message: "temporary cleanup failed",
			},
			data: undefined,
		});
		const getMeta = vi
			.fn()
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					size: 42,
					mimeType: "image/png",
					etag: "temporary-etag",
					status: "ready",
				},
			})
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					size: 42,
					mimeType: "image/png",
					etag: "canonical-etag",
					status: "ready",
				},
			});

		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta,
				stream,
				upload,
				delete: deleteObject,
			},
		});
		mocks.checkCanUpdateMedia.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.adjustInt.mockResolvedValueOnce({
			error: undefined,
			data: {
				applied: true,
			},
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("image/png");

		const response = await update(
			{
				config: {
					media: {
						limits: {
							storageBytes: false,
						},
					},
				},
			} as never,
			{
				fileName: "replacement.png",
				previousEtag: "previous-etag",
				previousSize: 24,
				previousKey: "public/original",
				previousType: "image",
				updatedKey: "awaiting-sync/upload",
				targetKey: "public/original",
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.etag).toBe("canonical-etag");
		expect(response.data?.sourceDeleted).toBe(false);
		expect(getMeta).toHaveBeenCalledWith(expect.any(Object), {
			key: "awaiting-sync/upload",
		});
		expect(mocks.detectStreamMimeType).toHaveBeenCalledWith(
			expect.any(Object),
			stream,
			"awaiting-sync/upload",
		);
		expect(upload).toHaveBeenCalledWith(expect.any(Object), {
			key: "public/original",
			body: Buffer.from("replacement-image"),
			mimeType: "image/png",
			extension: "png",
			size: 42,
			type: "image",
		});
		expect(deleteObject).toHaveBeenCalledWith(expect.any(Object), {
			key: "awaiting-sync/upload",
		});
		expect(mocks.adjustInt).toHaveBeenCalledWith(expect.anything(), {
			name: "media_storage_used",
			delta: 18,
			max: undefined,
			min: 0,
			ensure: true,
		});
	});

	it("rejects replacement uploads that change the media type", async () => {
		const deleteObject = vi.fn().mockResolvedValue({
			error: undefined,
			data: undefined,
		});

		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta: vi.fn().mockResolvedValueOnce({
					error: undefined,
					data: {
						size: 42,
						mimeType: "image/png",
						etag: "temporary-etag",
						status: "ready",
					},
				}),
				delete: deleteObject,
			},
		});
		mocks.checkCanUpdateMedia.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("video/mp4");

		const response = await update(
			{
				config: {
					media: {
						limits: {
							storageBytes: false,
						},
					},
				},
			} as never,
			{
				fileName: "replacement.mp4",
				previousSize: 24,
				previousKey: "public/original",
				previousType: "image",
				updatedKey: "awaiting-sync/upload",
				targetKey: "public/original",
			},
		);

		expect(response.error?.status).toBe(400);
		expect(deleteObject).toHaveBeenCalledWith(expect.any(Object), {
			key: "awaiting-sync/upload",
		});
	});

	it("renames replacement uploads when the target key changes", async () => {
		const stream = vi.fn().mockResolvedValue({
			error: undefined,
			data: {
				body: Buffer.from("replacement-image"),
			},
		});
		const deleteObject = vi.fn().mockResolvedValue({
			error: undefined,
			data: undefined,
		});
		const rename = vi.fn().mockResolvedValue({
			error: undefined,
			data: undefined,
		});
		const getMeta = vi
			.fn()
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					size: 42,
					mimeType: "image/png",
					etag: "temporary-etag",
					status: "ready",
				},
			})
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					size: 42,
					mimeType: "image/png",
					etag: "canonical-etag",
					status: "ready",
				},
			});

		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta,
				stream,
				delete: deleteObject,
				rename,
			},
		});
		mocks.checkCanUpdateMedia.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.adjustInt.mockResolvedValueOnce({
			error: undefined,
			data: {
				applied: true,
			},
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("image/png");

		const response = await update(
			{
				config: {
					media: {
						limits: {
							storageBytes: false,
						},
					},
				},
			} as never,
			{
				fileName: "replacement.png",
				previousEtag: "previous-etag",
				previousSize: 24,
				previousKey: "public/original",
				previousType: "image",
				updatedKey: "awaiting-sync/upload",
				targetKey: "private/original",
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			key: "private/original",
			etag: "canonical-etag",
			sourceDeleted: true,
		});
		expect(rename).toHaveBeenCalledWith(expect.any(Object), {
			from: "awaiting-sync/upload",
			to: "private/original",
		});
		expect(deleteObject).toHaveBeenCalledWith(expect.any(Object), {
			key: "public/original",
		});
	});
});
