import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStorage: vi.fn(),
	processImage: vi.fn(),
}));

vi.mock("../media/checks/check-has-media-storage.js", () => ({
	default: mocks.checkHasMediaStorage,
}));

vi.mock("../processed-images/process-image.js", () => ({
	default: mocks.processImage,
}));

import streamMedia from "./stream-media.js";

describe("cdn stream media", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("treats internal processed keys as missing", async () => {
		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: {
				stream: vi.fn(),
			},
		});

		const response = await streamMedia(
			{
				config: {
					media: {
						images: {
							presets: {},
							allowFormatQuery: true,
						},
					},
				},
			} as never,
			{
				key: "public/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
				query: {},
				accept: undefined,
			},
		);

		expect(response.error?.status).toBe(404);
	});

	it("passes preset rotation into the cache key and processor options", async () => {
		const stream = vi.fn().mockResolvedValue({
			error: undefined,
			data: undefined,
		});
		mocks.checkHasMediaStorage.mockResolvedValueOnce({
			error: undefined,
			data: { stream },
		});
		mocks.processImage.mockResolvedValueOnce({
			error: undefined,
			data: {
				key: "processed",
				contentLength: 3,
				contentType: "image/webp",
				body: new Uint8Array([1, 2, 3]),
			},
		});

		await streamMedia(
			{
				config: {
					media: {
						images: {
							presets: {
								portrait: {
									format: "webp",
									rotate: 90,
								},
							},
							allowFormatQuery: false,
						},
					},
				},
			} as never,
			{
				key: "public/123e4567e89b12d3a456426614174000",
				query: { preset: "portrait" },
				accept: undefined,
			},
		);

		expect(stream).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				key: "public/processed/123e4567e89b12d3a456426614174000-q80-r90-fwebp",
			}),
		);
		expect(mocks.processImage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				options: expect.objectContaining({ rotate: 90 }),
			}),
		);
	});
});
