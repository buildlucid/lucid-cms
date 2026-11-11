import z from "zod";
import constants from "../../constants/constants.js";

export const filterOperators = z
	.enum([
		"=",
		"!=",
		">",
		">=",
		"<",
		"<=",
		"in",
		"not-in",
		"is",
		"is-not",
		"contains",
		"not-contains",
		"starts-with",
		"not-starts-with",
		"ends-with",
		"not-ends-with",
	])
	.optional();

export const queryString = {
	schema: {
		filter: (
			multiple = false,
			options?: {
				example?: string;
				description?: string;
				/**
				 * Treats empty filter values as null. Also mark the column nullable in the controller's
				 * buildFormattedQuery call.
				 */
				nullable?: boolean;
			},
		) =>
			z
				.string()
				.trim()
				.meta({
					description: multiple
						? options?.description ||
							"Matches several values with the in or not-in operator: repeat the parameter once per value, eg. filter[id:in]=1&filter[id:in]=2. Commas are part of the value."
						: (options?.description || "Accepts a single value only.") +
							(options?.nullable ? " Leave empty for null comparison" : ""),
					example: options?.example,
				})
				.optional(),
		sort: (example: string) =>
			z
				.string()
				.trim()
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
				.trim()
				.meta({
					description:
						"Specifies related resources to include in response as comma-separated values",
					example: example,
				})
				.optional(),
		exclude: (example: string) =>
			z
				.string()
				.trim()
				.meta({
					description:
						"Defines fields to exclude from response as comma-separated values",
					example: example,
				})
				.optional(),
		page: z
			.string()
			.trim()
			.regex(/^[1-9][0-9]*$/)
			.describe(
				"Specifies the page number for pagination (must be a positive integer)",
			)
			.optional(),
		perPage: z
			.string()
			.trim()
			.regex(/^([1-9][0-9]*|-1)$/)
			.describe(
				"Sets the number of items per page (use positive integer or -1 for all items)",
			)
			.optional(),
		/** The content API's `perPage`, which is capped and has no "all items" value. */
		contentPerPage: z
			.string()
			.trim()
			.regex(/^[1-9][0-9]*$/)
			.describe(
				`Sets the number of items per page, up to ${constants.query.maxContentPerPage}`,
			)
			.optional(),
	},
	meta: {
		patternProperties: {
			"^filter\\[([^\\]:]+):?([^\\]]*)\\]$": {
				type: ["string", "null"],
				description:
					"Dynamic filter parameter in format filter[fieldName:operator]. Supported operators include: '=', '!=', '>', '>=', '<', '<=', 'in', 'not-in', 'is', 'is-not', 'contains', 'not-contains', 'starts-with', 'not-starts-with', 'ends-with' and 'not-ends-with'. Text-filter values are literal, including '%', '_' and backslashes. Text matching is case-insensitive according to the database adapter and collation.",
			},
			"^filter\\[or\\]\\[[0-9]+\\]\\[([^\\]:]+):?([^\\]]*)\\]$": {
				type: ["string", "null"],
				description:
					"Grouped OR filter parameter in format filter[or][groupIndex][fieldName:operator]. Conditions within a group are ANDed, groups are ORed.",
			},
		},
		additionalProperties: false,
	},
};

/** Shared schemas for parsed query parameters. */
export const queryFormatted = {
	schema: {
		filters: {
			single: z.object({
				value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
				operator: filterOperators,
			}),
			union: z.object({
				value: z.union([
					z.string(),
					z.array(z.string()),
					z.number(),
					z.array(z.number()),
					z.boolean(),
					z.array(z.boolean()),
				]),
				operator: filterOperators,
			}),
		},
		filterOr: z
			.array(
				z.array(
					z.object({
						key: z.string(),
						value: z.union([
							z.string(),
							z.array(z.string()),
							z.number(),
							z.array(z.number()),
							z.boolean(),
							z.array(z.boolean()),
							z.null(),
						]),
						operator: filterOperators,
					}),
				),
			)
			.optional(),
		page: z.number(),
		perPage: z.number(),
		/** The content API's `perPage`, which is capped and has no "all items" value. */
		contentPerPage: z
			.number()
			.int()
			.min(1)
			.max(constants.query.maxContentPerPage),
	},
};
