import { controllerSchemas } from "../../../../schemas/email.js";
import { paginationSchema } from "../../schema.js";
import { emailReadSchema } from "../schema.js";

export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = emailReadSchema.extend({
	query: querySchema.prefault({}),
});
