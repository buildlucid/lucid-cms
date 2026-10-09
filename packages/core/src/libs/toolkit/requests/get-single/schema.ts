import { requestReadSchema, requestWriteSchema } from "../schema.js";

export const inputSchema = requestReadSchema.extend({
	id: requestWriteSchema.shape.id,
});
