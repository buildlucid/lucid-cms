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
		const tenant = {
			key: "marketing",
			name: "Marketing",
		};
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
				},
			})
			.mockResolvedValueOnce({
				error: undefined,
				data: {
					size: 42,
					mimeType: "image/png",
					etag: "canonical-etag",
				},
			});

		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
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
					tenants: [tenant],
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
				previousKey: "public/marketing/original",
				tenantKey: "marketing",
				previousType: "image",
				updatedKey: "awaiting-sync/marketing/upload",
				targetKey: "public/marketing/original",
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.etag).toBe("canonical-etag");
		expect(response.data?.sourceDeleted).toBe(false);
		expect(getMeta).toHaveBeenCalledWith({
			key: "awaiting-sync/marketing/upload",
			tenant,
			context: expect.any(Object),
		});
		expect(mocks.detectStreamMimeType).toHaveBeenCalledWith(
			stream,
			"awaiting-sync/marketing/upload",
			tenant,
			expect.any(Object),
		);
		expect(upload).toHaveBeenCalledWith({
			key: "public/marketing/original",
			data: Buffer.from("replacement-image"),
			meta: {
				mimeType: "image/png",
				extension: "png",
				size: 42,
				type: "image",
			},
			tenant,
			context: expect.any(Object),
		});
		expect(deleteObject).toHaveBeenCalledWith({
			key: "awaiting-sync/marketing/upload",
			tenant,
			context: expect.any(Object),
		});
		expect(mocks.adjustInt).toHaveBeenCalledWith(expect.anything(), {
			name: "media_storage_used:t:marketing",
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
				tenantKey: null,
				previousType: "image",
				updatedKey: "awaiting-sync/upload",
				targetKey: "public/original",
			},
		);

		expect(response.error?.status).toBe(400);
		expect(deleteObject).toHaveBeenCalledWith({
			key: "awaiting-sync/upload",
			tenant: null,
			context: expect.any(Object),
		});
	});

	it("copies global replacement uploads into tenant media targets", async () => {
		const tenant = {
			key: "marketing",
			name: "Marketing",
		};
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
			error: undefined,
			data: undefined,
		});
		const rename = vi.fn();
		const getMeta = vi
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
			});

		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {
				getMeta,
				stream,
				upload,
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
					tenants: [tenant],
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
				previousKey: "public/marketing/original",
				tenantKey: "marketing",
				previousType: "image",
				updatedKey: "awaiting-sync/upload",
				targetKey: "private/marketing/original",
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data).toMatchObject({
			key: "private/marketing/original",
			etag: "canonical-etag",
			sourceDeleted: true,
		});
		expect(rename).not.toHaveBeenCalled();
		expect(stream).toHaveBeenCalledWith({
			key: "awaiting-sync/upload",
			tenant: null,
			context: expect.any(Object),
		});
		expect(upload).toHaveBeenCalledWith({
			key: "private/marketing/original",
			data: Buffer.from("replacement-image"),
			meta: {
				mimeType: "image/png",
				extension: "png",
				size: 42,
				type: "image",
			},
			tenant,
			context: expect.any(Object),
		});
		expect(deleteObject).toHaveBeenCalledWith({
			key: "awaiting-sync/upload",
			tenant: null,
			context: expect.any(Object),
		});
		expect(deleteObject).toHaveBeenCalledWith({
			key: "public/marketing/original",
			tenant,
			context: expect.any(Object),
		});
	});
});
