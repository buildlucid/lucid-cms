import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import { paginationSchema } from "../../schema.js";
import { libraryOnlySchema } from "../schema.js";

export const querySchema =
	controllerSchemas.content.getMultiple.query.formatted.extend(
		paginationSchema.shape,
	);

export const inputSchema = z.object({
	query: querySchema.prefault({}),
	libraryOnly: libraryOnlySchema,
});
