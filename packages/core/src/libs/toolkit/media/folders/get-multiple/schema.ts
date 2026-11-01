import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media-folders.js";
import { paginationSchema } from "../../../schema.js";

export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = z.strictObject({
	query: querySchema.prefault({}),
});
