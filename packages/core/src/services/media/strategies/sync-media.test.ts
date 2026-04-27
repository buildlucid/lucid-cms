import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStrategy: vi.fn(),
	checkCanStoreMedia: vi.fn(),
	adjustInt: vi.fn(),
	detectStreamMimeType: vi.fn(),
}));

vi.mock("../../index.js", () => ({
	mediaServices: {
		checks: {
			checkHasMediaStrategy: mocks.checkHasMediaStrategy,
			checkCanStoreMedia: mocks.checkCanStoreMedia,
		},
	},
	optionServices: {
		adjustInt: mocks.adjustInt,
	},
}));

vi.mock("../helpers/detect-stream-mime-type.js", () => ({
	default: mocks.detectStreamMimeType,
}));

import syncMedia from "./sync-media.js";

describe("media sync strategy", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("uses sniffed mime type when storage metadata is generic", async () => {
		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta: vi.fn().mockResolvedValueOnce({
					error: undefined,
					data: {
						size: 42,
						mimeType: "application/octet-stream",
						etag: "object-etag",
					},
				}),
				stream: vi.fn(),
				delete: vi.fn(),
			},
		});
		mocks.checkCanStoreMedia.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("image/png");
		mocks.adjustInt.mockResolvedValueOnce({
			error: undefined,
			data: {
				applied: true,
			},
		});

		const response = await syncMedia(
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
				key: "public/upload",
				fileName: "upload.bin",
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.mimeType).toBe("image/png");
		expect(response.data?.type).toBe("image");
		expect(response.data?.extension).toBe("png");
	});

	it("rejects detected content that does not match the declared media type", async () => {
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
						etag: "object-etag",
					},
				}),
				stream: vi.fn(),
				delete: deleteObject,
			},
		});
		mocks.checkCanStoreMedia.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("video/mp4");

		const response = await syncMedia(
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
				key: "public/upload",
				fileName: "profile.png",
				allowedType: "image",
			},
		);

		expect(response.error?.status).toBe(400);
		expect(deleteObject).toHaveBeenCalledWith("public/upload");
		expect(mocks.adjustInt).not.toHaveBeenCalled();
	});
});
