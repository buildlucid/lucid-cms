import z from "zod";

export const filterOperators = z
	.enum(["=", "%", "like", "ilike", "in", "not in", "<>", "is not", "is", "!="])
	.optional();

export const queryString = {
	schema: {
		filter: (multiple = false, example?: string, description?: string) =>
			z
				.string()
				.meta({
					description: multiple
						? description || "Accepts multiple values separated by commas."
						: description || "Accepts a single value only.",
					example: example,
				})
				.optional(),
		sort: (example: string) =>
			z
				.string()
				// .regex(/^-?[a-zA-Z0-9_]+(,-?[a-zA-Z0-9_]+)*$/)
				.meta({
					description:
						"Orders results using comma-separated field names. Prefix with - for descending order.",
					example: example,
				})
				.optional(),
		include: (example: string) =>
			z
				.string()
				.meta({
					description:
						"Specifies related resources to include in response as comma-separated values",
					example: example,
				})
				.optional(),
		exclude: (example: string) =>
			z
				.string()
				.meta({
					description:
						"Defines fields to exclude from response as comma-separated values",
					example: example,
				})
				.optional(),
		page: z
			.string()
			.regex(/^[1-9][0-9]*$/)
			.describe(
				"Specifies the page number for pagination (must be a positive integer)",
			)
			.optional(),
		perPage: z
			.string()
			.regex(/^([1-9][0-9]*|-1)$/)
			.describe(
				"Sets the number of items per page (use positive integer or -1 for all items)",
			)
			.optional(),
	},
	meta: {
		patternProperties: {
			"^filter\\[([^\\]:]+):?([^\\]]*)\\]$": {
				type: ["string", "null"],
				description:
					"Dynamic filter parameter in format filter[fieldName:operator]. Supported operators include: '=', '%', 'like', 'ilike', 'in', 'not in', '<>', 'is not', 'is' and '!='.",
			},
		},
		additionalProperties: false,
	},
};

/**
 * @description The entire queryFromatted schema
 * ```typescript
 *  filter: z.object({}).optional(),
 *  sort: z
 *      .array(
 *          z.object({
 *              key: z.string(),
 *              value: z.enum(["asc", "desc"]),
 *          }),
 *      )
 *      .optional(),
 *  include: z.array(z.string()).optional(),
 *  exclude: z.array(z.string()).optional(),
 *  page: z.number(),
 *  perPage: z.number(),
 * ```
 */
export const queryFormatted = {
	schema: {
		filters: {
			single: z.object({
				value: z.union([z.string(), z.number()]),
				operator: filterOperators,
			}),
			union: z.object({
				value: z.union([
					z.string(),
					z.array(z.string()),
					z.number(),
					z.array(z.number()),
				]),
				operator: filterOperators,
			}),
		},
		page: z.number(),
		perPage: z.number(),
	},
};
