import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStrategy: vi.fn(),
	checkCanUpdateMedia: vi.fn(),
	adjustInt: vi.fn(),
	detectStreamMimeType: vi.fn(),
}));

vi.mock("../../index.js", () => ({
	mediaServices: {
		checks: {
			checkHasMediaStrategy: mocks.checkHasMediaStrategy,
			checkCanUpdateMedia: mocks.checkCanUpdateMedia,
		},
	},
	optionServices: {
		adjustInt: mocks.adjustInt,
	},
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

		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta: vi
					.fn()
					.mockResolvedValueOnce({
						error: undefined,
						data: {
							size: 42,
							mimeType: "image/png",
							etag: "temporary-etag",
						},
					})
					.mockResolvedValueOnce({
						error: undefined,
						data: {
							size: 42,
							mimeType: "image/png",
							etag: "canonical-etag",
						},
					}),
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
							storage: false,
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
		expect(upload).toHaveBeenCalledWith({
			key: "public/original",
			data: Buffer.from("replacement-image"),
			meta: {
				mimeType: "image/png",
				extension: "png",
				size: 42,
				type: "image",
			},
		});
		expect(deleteObject).toHaveBeenCalledWith("awaiting-sync/upload");
	});

	it("rejects replacement uploads that change the media type", async () => {
		const deleteObject = vi.fn().mockResolvedValue({
			error: undefined,
			data: undefined,
		});

		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta: vi.fn().mockResolvedValueOnce({
					error: undefined,
					data: {
						size: 42,
						mimeType: "image/png",
						etag: "temporary-etag",
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
							storage: false,
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
		expect(deleteObject).toHaveBeenCalledWith("awaiting-sync/upload");
	});
});
