import { expect, test } from "vitest";
import z from "zod";
import prepareToolInput from "./prepare-input.js";

test("drops nulls sent for optional fields and keeps nulls the schema accepts", async () => {
	const input = {
		title: "Hello",
		alt: null,
		at: null,
		bricks: [{ ref: null, key: "hero" }],
	};

	const prepared = await prepareToolInput(
		{
			name: "test_tool",
			input: z.object({
				title: z.string(),
				alt: z.string().min(1).optional(),
				at: z.string().nullable(),
				bricks: z.array(
					z.object({ ref: z.string().optional(), key: z.string() }),
				),
			}),
			requirements: ({ input }) => [input],
			handler: async () => ({ error: undefined, data: {} }),
			checkResult: async () => ({ type: "success", data: {} }),
		},
		input,
	);

	expect(prepared.type === "ready" && prepared.data.requirements).toStrictEqual(
		[{ title: "Hello", at: null, bricks: [{ key: "hero" }] }],
	);
	expect(input.alt).toBeNull();
});
