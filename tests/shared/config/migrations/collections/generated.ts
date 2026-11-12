import { defineCollection, field, z } from "@lucidcms/core";

export const GENERATED_KEY = "mig-generated";

const PREFIX = "generated:";

const fieldsSchema = z.array(
	z.object({
		key: z.string(),
		type: z.enum(["text", "number"]),
		index: z.boolean().optional(),
	}),
);

/** One field of a generated collection. */
export type GeneratedField = z.infer<typeof fieldsSchema>[number];

/** A schema step that is written out in its own name, rather than registered. */
export type GeneratedStep = `${typeof PREFIX}${string}`;

export const isGeneratedStep = (step: string): step is GeneratedStep =>
	step.startsWith(PREFIX);

/**
 * Names a schema step whose collection has exactly these fields. Tests that try many versions
 * of a collection, such as a simulation, use it in place of a registered step.
 */
export const generatedStep = (fields: GeneratedField[]): GeneratedStep =>
	`${PREFIX}${JSON.stringify(fields)}`;

/** Builds the collection a generated step describes. */
export const generatedCollection = (step: GeneratedStep) =>
	defineCollection({
		key: GENERATED_KEY,
		mode: "multiple",
		details: {
			labels: { singular: "Generated", plural: "Generated" },
		},
		fields: fieldsSchema
			.parse(JSON.parse(step.slice(PREFIX.length)))
			.map(({ key, type, index }) =>
				type === "text"
					? field.text(key, { index })
					: field.number(key, { index }),
			),
	});
