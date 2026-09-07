import z from "zod";
import { queryFormatted } from "../../../schemas/helpers/querystring.js";
import type { QueryFilters } from "../../../types/query-params.js";

const filterSchema = z.union([
	queryFormatted.schema.filters.single.strict(),
	queryFormatted.schema.filters.union.strict(),
]);

const nestedFiltersSchema: z.ZodType<QueryFilters> = z.lazy(() =>
	z.record(z.string(), z.union([filterSchema, nestedFiltersSchema]).optional()),
);

export const documentFilterSchema = z
	.union([nestedFiltersSchema, z.array(nestedFiltersSchema)])
	.optional();

export const documentInputSchema = z.object({
	collectionKey: z.string().min(1),
	version: z.string().min(1),
	preview: z.string().min(1).nullable().optional(),
});
