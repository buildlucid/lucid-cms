import { describe, expect, it } from "vitest";
import responses from "./responses.js";

describe("OpenAPI responses", () => {
	it("places dataSchema under the response data property", () => {
		const dataSchema = { type: "string" } as const;
		const result = responses({ dataSchema });

		expect(result[200]).toMatchObject({
			content: {
				"application/json": {
					schema: {
						properties: {
							data: dataSchema,
						},
					},
				},
			},
		});
	});
});
