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

describe("OpenAPI streaming responses", () => {
	it("describes the event stream alongside a JSON response for when it doesn't stream", () => {
		const result = responses({
			stream: true,
			status: 202,
			dataSchema: { type: "object" },
		});

		expect(result[200]).toMatchObject({
			content: { "text/event-stream": { schema: { type: "string" } } },
		});
		expect(result[202]).toMatchObject({
			content: { "application/json": {} },
		});
		expect(result[204]).toBeUndefined();
	});
});
