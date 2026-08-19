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

import syncMedia from "./sync-media.js";

describe("media sync strategy", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("uses sniffed mime type when storage metadata is generic", async () => {
		const getMeta = vi.fn().mockResolvedValueOnce({
			error: undefined,
			data: {
				size: 42,
				mimeType: "application/octet-stream",
				etag: "object-etag",
				status: "processing",
				width: 1920,
				height: 1080,
				duration: 12.5,
				adapterReference: "provider-file-id",
				adapterData: { libraryId: "library-id" },
			},
		});
		const stream = vi.fn();
		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: {
				key: "provider",
				getMeta,
				stream,
				delete: vi.fn(),
			},
		});
		mocks.checkCanStoreMedia.mockResolvedValueOnce({
			error: undefined,
			data: undefined,
		});
		mocks.detectStreamMimeType.mockResolvedValueOnce("video/mp4");
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
							storageBytes: false,
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
		expect(response.data?.mimeType).toBe("video/mp4");
		expect(response.data?.type).toBe("video");
		expect(response.data?.extension).toBe("mp4");
		expect(response.data).toMatchObject({
			status: "processing",
			width: 1920,
			height: 1080,
			duration: 12.5,
			storageAdapterKey: "provider",
			storageAdapterReference: "provider-file-id",
			storageAdapterData: { libraryId: "library-id" },
		});
		expect(getMeta).toHaveBeenCalledWith(expect.any(Object), {
			key: "public/upload",
		});
		expect(mocks.detectStreamMimeType).toHaveBeenCalledWith(
			expect.any(Object),
			stream,
			"public/upload",
		);
		expect(mocks.adjustInt).toHaveBeenCalledWith(expect.anything(), {
			name: "media_storage_used",
			delta: 42,
			max: undefined,
			min: 0,
			ensure: true,
		});
	});

	it("rejects detected content that does not match the declared media type", async () => {
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
						etag: "object-etag",
						status: "ready",
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
							storageBytes: false,
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
		expect(deleteObject).toHaveBeenCalledWith(expect.any(Object), {
			key: "public/upload",
		});
		expect(mocks.adjustInt).not.toHaveBeenCalled();
	});
});
