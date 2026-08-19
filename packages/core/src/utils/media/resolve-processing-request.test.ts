import { describe, expect, it } from "vitest";
import resolveProcessingRequest from "./resolve-processing-request.js";

describe("resolveProcessingRequest", () => {
	it("resolves rotation from image presets without exposing it in the query", () => {
		const result = resolveProcessingRequest({
			presets: {
				portrait: {
					width: 400,
					rotate: 90,
				},
			},
			allowFormatQuery: false,
			query: { preset: "portrait" },
		});

		expect(result.rotate).toBe(90);
		expect(result.preset).toBe("portrait");
		expect(result.publicQuery).toEqual({
			preset: "portrait",
			format: undefined,
		});
	});
});
