import { controllerSchemas } from "../../../../schemas/users.js";
import { paginationSchema } from "../../schema.js";
import { userReadSchema } from "../schema.js";

export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = userReadSchema.extend({
	query: querySchema.prefault({}),
});
