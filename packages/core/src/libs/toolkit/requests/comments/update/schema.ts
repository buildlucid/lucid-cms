import { requestBodySchema, requestCommentSchema } from "../../schema.js";

export const inputSchema = requestCommentSchema.extend({
	body: requestBodySchema,
});
