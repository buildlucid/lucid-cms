import { describe, expect, it } from "vitest";
import getMediaPreviewUrl from "./media-preview";

describe("getMediaPreviewUrl", () => {
	it("uses the original URL when Lucid preset queries are unsupported", () => {
		expect(
			getMediaPreviewUrl(
				{
					url: "https://cdn.example.com/image.jpg",
					delivery: {
						adapter: "external",
						data: null,
						supportsPresetQuery: false,
					},
				},
				"thumbnail-small",
			),
		).toBe("https://cdn.example.com/image.jpg");
	});

	it("adds the requested preset while preserving existing query parameters", () => {
		expect(
			getMediaPreviewUrl(
				{
					url: "https://cms.example.com/api/v1/media/image.jpg?download=false",
					delivery: {
						adapter: "sharp",
						data: null,
						supportsPresetQuery: true,
					},
				},
				"thumbnail-large",
			),
		).toBe(
			"https://cms.example.com/api/v1/media/image.jpg?download=false&preset=thumbnail-large",
		);
	});
});
