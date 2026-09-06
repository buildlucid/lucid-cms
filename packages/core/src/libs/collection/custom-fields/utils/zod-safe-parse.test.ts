import { expect, expectTypeOf, test } from "vitest";
import z from "zod";
import type { FieldOptions } from "../types.js";
import zodSafeParse from "./zod-safe-parse.js";

const configuredField = { preserveValue: true, fieldKey: "title" };

test("configured schemas validate scalar and structured values without replacing them", () => {
	expect(zodSafeParse("Hello", z.string().min(2), configuredField)).toEqual({
		valid: true,
	});
	expect(zodSafeParse("H", z.string().min(2), configuredField).valid).toBe(
		false,
	);
	expect(
		zodSafeParse(
			{ title: "Hello", tags: ["news", "cms"] },
			z.object({ tags: z.array(z.string()), title: z.string() }),
			configuredField,
		),
	).toEqual({ valid: true });
	expect(
		zodSafeParse(
			{ title: "Hello", other: true },
			z.looseObject({ title: z.string() }),
			configuredField,
		),
	).toEqual({ valid: true });
});

test.each([
	{
		value: "hello",
		schema: z.string().transform((value) => value.toUpperCase()),
	},
	{ value: " hello ", schema: z.string().trim() },
	{ value: "12", schema: z.coerce.number() },
	{ value: {}, schema: z.object({ title: z.string().default("Hello") }) },
	{
		value: { title: "Hello", other: true },
		schema: z.object({ title: z.string() }),
	},
])("configured schemas cannot change a value: %j", ({ value, schema }) => {
	expect(() => zodSafeParse(value, schema, configuredField)).toThrow(
		'Validation for field "title" changed its value',
	);
});

test("field schemas accept only compatible input and output types", () => {
	type NumberSchema = NonNullable<
		NonNullable<FieldOptions<"number">["validation"]>["zod"]
	>;
	type TextSchema = NonNullable<
		NonNullable<FieldOptions<"text">["validation"]>["zod"]
	>;
	expectTypeOf(z.number().min(2)).toMatchTypeOf<NumberSchema>();
	expectTypeOf(z.string()).not.toMatchTypeOf<NumberSchema>();
	expectTypeOf(z.string().transform(Number)).not.toMatchTypeOf<TextSchema>();
});
