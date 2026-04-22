import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	checkHasMediaStrategy: vi.fn(),
}));

vi.mock("../index.js", () => ({
	mediaServices: {
		checks: {
			checkHasMediaStrategy: mocks.checkHasMediaStrategy,
		},
	},
	processedImageServices: {
		processImage: vi.fn(),
	},
}));

import streamMedia from "./stream-media.js";

describe("cdn stream media", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("treats internal processed keys as missing", async () => {
		mocks.checkHasMediaStrategy.mockResolvedValueOnce({
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
							onDemandFormats: true,
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
});
