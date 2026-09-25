import { expect, test } from "vitest";
import z from "zod";
import { toPortableJsonSchema } from "./portable-json-schema.js";

test("respells type arrays and empty schemas without touching data or property names", () => {
	const schema = z.object({
		type: z.enum(["image", "video"]),
		title: z.string().nullable().meta({ description: "Title." }),
		value: z.union([z.string(), z.number(), z.null()]).default(null),
		fields: z.record(z.string(), z.unknown()),
		refs: z.array(z.unknown()),
	});

	expect(toPortableJsonSchema(z.toJSONSchema(schema))).toEqual({
		$schema: "https://json-schema.org/draft/2020-12/schema",
		type: "object",
		properties: {
			type: { type: "string", enum: ["image", "video"] },
			title: {
				anyOf: [{ type: "string" }, { type: "null" }],
				description: "Title.",
			},
			value: {
				anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
				default: null,
			},
			fields: {
				type: "object",
				propertyNames: { type: "string" },
				additionalProperties: true,
			},
			refs: { type: "array" },
		},
		required: ["type", "title", "value", "fields", "refs"],
		additionalProperties: false,
	});
});
