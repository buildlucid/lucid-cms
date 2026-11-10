import { controllerSchemas } from "../../../../schemas/requests.js";
import { filterInputSchema, paginationSchema } from "../../schema.js";
import { requestReadSchema } from "../schema.js";

/** Validates flattened filters against the request service's list query. */
export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = requestReadSchema.extend({
	filter: filterInputSchema,
	sort: querySchema.shape.sort,
	...paginationSchema.shape,
});
