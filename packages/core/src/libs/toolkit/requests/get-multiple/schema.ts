import { controllerSchemas } from "../../../../schemas/requests.js";
import { paginationSchema } from "../../schema.js";
import { requestReadSchema } from "../schema.js";

export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = requestReadSchema.extend({
	query: querySchema.prefault({}),
});
