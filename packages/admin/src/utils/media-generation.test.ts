import { describe, expect, it } from "vitest";
import { acceptedGenerationTypes, fitImageOptions } from "./media-generation";

describe("acceptedGenerationTypes", () => {
	it("offers every type without an accept value", () => {
		expect(acceptedGenerationTypes()).toEqual(["image", "audio"]);
	});

	it("offers the types whose generated files the input accepts", () => {
		expect(acceptedGenerationTypes("image/*")).toEqual(["image"]);
		expect(acceptedGenerationTypes(".png, .mp3")).toEqual(["image", "audio"]);
		expect(acceptedGenerationTypes("audio/mpeg")).toEqual(["audio"]);
		expect(acceptedGenerationTypes("video/*,.pdf")).toEqual([]);
	});
});

describe("fitImageOptions", () => {
	const model = {
		aspectRatios: ["16:9", "1:1"],
		resolutions: ["1K", "2K"],
		qualities: ["low", "auto"],
		outputFormats: ["png", "webp"],
	};

	it("keeps options the model offers", () => {
		const current = {
			aspectRatio: "16:9",
			resolution: "2K",
			quality: "low",
			outputFormat: "png",
		};
		expect(fitImageOptions(model, current)).toEqual(current);
	});

	it("falls back to the preferred option, then the model's first", () => {
		expect(
			fitImageOptions(model, { aspectRatio: "21:9", quality: "high" }),
		).toEqual({
			aspectRatio: "1:1",
			resolution: "1K",
			quality: "auto",
			outputFormat: "webp",
		});
		expect(
			fitImageOptions(
				{ ...model, qualities: ["medium", "high"], outputFormats: ["jpeg"] },
				{},
			),
		).toMatchObject({ quality: "medium", outputFormat: "jpeg" });
	});

	it("leaves out options the model picks itself", () => {
		expect(
			fitImageOptions(
				{ ...model, resolutions: [], qualities: [], outputFormats: [] },
				{ resolution: "2K", quality: "low", outputFormat: "png" },
			),
		).toEqual({
			aspectRatio: "1:1",
			resolution: null,
			quality: null,
			outputFormat: null,
		});
	});
});
