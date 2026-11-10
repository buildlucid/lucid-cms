import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media-folders.js";
import { filterInputSchema, paginationSchema } from "../../../schema.js";

/** Validates flattened filters against the folder service's list query. */
export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = z.strictObject({
	filter: filterInputSchema,
	sort: querySchema.shape.sort,
	...paginationSchema.shape,
});
