import { describe, expect, it } from "vitest";
import { generationDetails } from "./generation-details";

describe("generationDetails", () => {
	it("leaves out options the model picked itself", () => {
		const details = generationDetails({
			type: "image",
			model: "image-model",
			modelName: "Image model",
			instruction: "A lighthouse at dusk",
			sourceLabel: "None",
			previousInstructions: [],
			includeInPreviousInstructions: true,
			aspectRatio: "1:1",
			resolution: null,
			quality: "high",
			outputFormat: null,
		});

		expect(details.map((detail) => detail.value)).toEqual([
			"Image model",
			"None",
			"Square (1:1)",
			"High",
		]);
	});
});
