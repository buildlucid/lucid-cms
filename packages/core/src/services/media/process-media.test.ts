import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	selectSingleActivePresentationByKey: vi.fn(),
	checkHasMediaStrategy: vi.fn(),
}));

vi.mock("../../libs/repositories/index.js", () => ({
	MediaRepository: class {
		selectSingleActivePresentationByKey =
			mocks.selectSingleActivePresentationByKey;
	},
}));

vi.mock("../index.js", () => ({
	mediaServices: {
		checks: {
			checkHasMediaStrategy: mocks.checkHasMediaStrategy,
		},
	},
}));

import processMedia from "./process-media.js";

describe("media process service", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns the canonical media URL with supported processing query params", async () => {
		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
			error: undefined,
			data: {},
		});
		mocks.selectSingleActivePresentationByKey.mockResolvedValueOnce({
			error: undefined,
			data: {
				type: "image",
				key: "public/123e4567e89b12d3a456426614174000",
				file_name: "Screenshot 2026-03-26 at 15.png",
				file_extension: "png",
				tenant_key: null,
			},
		});
		const response = await processMedia(
			{
				db: {
					client: {},
				},
				request: {
					url: "https://example.com/lucid/api/v1/client/media/process/public/test",
				},
				config: {
					host: "https://example.com",
					db: {
						getDefault: vi.fn().mockReturnValue(0),
					},
					media: {
						images: {
							presets: {
								"thumbnail-small": {
									width: 400,
								},
							},
							allowFormatQuery: true,
						},
					},
				},
			} as never,
			{
				key: "public/123e4567e89b12d3a456426614174000",
				body: {
					preset: "thumbnail-small",
					format: "webp",
				},
			},
		);

		expect(response.error).toBeUndefined();
		expect(response.data?.url).toBe(
			"https://example.com/lucid/cdn/public/123e4567e89b12d3a456426614174000/screenshot-2026-03-26-at-15.webp?preset=thumbnail-small&format=webp",
		);
	});

	it("rejects direct processed keys", async () => {
		const response = await processMedia(
			{
				config: {
					host: "https://example.com",
					db: {},
				},
			} as never,
			{
				key: "public/processed/123e4567e89b12d3a456426614174000-w400-fwebp",
				body: {
					preset: "thumbnail-small",
				},
			},
		);

		expect(response.error?.status).toBe(404);
		expect(mocks.checkHasMediaStrategy).not.toHaveBeenCalled();
		expect(mocks.selectSingleActivePresentationByKey).not.toHaveBeenCalled();
	});
});
