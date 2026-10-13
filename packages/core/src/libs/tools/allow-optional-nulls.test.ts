import { expect, test } from "vitest";
import z from "zod";
import allowOptionalNulls from "./allow-optional-nulls.js";

test("lets optional properties be null at any depth, leaving required and nullable ones alone", () => {
	const schema = z.object({
		id: z.number(),
		title: z.string().optional().meta({ description: "Title." }),
		at: z.string().nullable().optional(),
		bricks: z.array(z.object({ ref: z.string().optional() })),
		fields: z.object({ enum: z.string().optional() }),
	});

	expect(
		allowOptionalNulls(z.toJSONSchema(schema, { io: "input" })),
	).toMatchObject({
		properties: {
			id: { type: "number" },
			title: {
				description: "Title.",
				anyOf: [{ type: "string" }, { type: "null" }],
			},
			at: { type: ["string", "null"] },
			bricks: {
				items: {
					properties: {
						ref: { anyOf: [{ type: "string" }, { type: "null" }] },
					},
				},
			},
			fields: {
				properties: {
					enum: { anyOf: [{ type: "string" }, { type: "null" }] },
				},
			},
		},
	});
});
