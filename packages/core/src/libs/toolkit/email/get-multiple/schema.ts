import { controllerSchemas } from "../../../../schemas/email.js";
import { filterInputSchema, paginationSchema } from "../../schema.js";
import { emailReadSchema } from "../schema.js";

/** Validates flattened filters against the email service's list query. */
export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = emailReadSchema.extend({
	filter: filterInputSchema,
	sort: querySchema.shape.sort,
	...paginationSchema.shape,
});
