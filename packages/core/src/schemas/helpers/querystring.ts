import z from "zod/v4";

export const filterOperators = z
	.enum(["=", "%", "like", "ilike", "in", "not in", "<>", "is not", "is", "!="])
	.optional();

export const queryString = {
	schema: {
		filter: (
			multiple = false,
			options?: {
				example?: string;
				description?: string;
				/**
				 * When true, if the filter value is empty it will be treated as you querying for the column being equal to null.
				 * You'll also need to mark the column as nullable in the buildFormattedQuery helper in your controller.
				 */
				nullable?: boolean;
			},
		) =>
			z
				.string()
				.meta({
					description: multiple
						? options?.description ||
							"Accepts multiple values separated by commas."
						: (options?.description || "Accepts a single value only.") +
							(options?.nullable ? " Leave empty for null comparison" : ""),
					example: options?.example,
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
				value: z.union([z.string(), z.number(), z.null()]),
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
