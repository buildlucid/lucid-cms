import { controllerSchemas } from "../../../../schemas/users.js";
import { filterInputSchema, paginationSchema } from "../../schema.js";
import { userReadSchema } from "../schema.js";

/** Validates flattened filters against the user service's list query. */
export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = userReadSchema.extend({
	filter: filterInputSchema,
	sort: querySchema.shape.sort,
	...paginationSchema.shape,
});
