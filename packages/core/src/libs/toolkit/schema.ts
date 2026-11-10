import type { DocumentFilters } from "@lucidcms/types";
import z from "zod";
import { filterOperators } from "../../schemas/helpers/querystring.js";

export const paginationSchema = z.object({
	/** One-based page number. Defaults to 1. */
	page: z.number().int().positive().default(1),
	/** Maximum items per page. Use -1 for all matches. Defaults to 10. */
	perPage: z.union([z.literal(-1), z.number().int().positive()]).default(10),
});

const filterValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.array(z.string()),
	z.array(z.number()),
	z.array(z.boolean()),
]);

/** A plain value, matched for equality, or a value with an operator. */
const filterConditionSchema = z.union([
	filterValueSchema,
	z.strictObject({ value: filterValueSchema, operator: filterOperators }),
]);

const nestedFiltersSchema: z.ZodType<DocumentFilters> = z.lazy(() =>
	z.record(
		z.string(),
		z.union([filterConditionSchema, nestedFiltersSchema]).optional(),
	),
);

/** One filter object, whose conditions must all match, or a list of them, where any may match. Each read checks the keys once they are flattened. */
export const filterInputSchema = z
	.union([nestedFiltersSchema, z.array(nestedFiltersSchema)])
	.optional();
