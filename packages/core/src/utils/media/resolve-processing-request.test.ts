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

	it.for([
		{ accept: "*/*", format: "jpeg" },
		{ accept: "image/webp,*/*", format: "webp" },
	])(
		"with format queries on, gives $format for Accept $accept",
		({ accept, format }) => {
			const result = resolveProcessingRequest({
				presets: { card: { width: 400, format: "jpeg" } },
				allowFormatQuery: true,
				query: { preset: "card" },
				accept,
			});

			expect(result.format).toBe(format);
		},
	);
});
