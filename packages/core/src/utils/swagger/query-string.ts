import z from "zod";

const queryString = {
	schema: {
		filter: (multiple = false, example?: string) =>
			z
				.string()
				.meta({
					description: multiple
						? "Accepts multiple values separated by commas."
						: "Accepts a single value only.",
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

export default queryString;
