import { controllerSchemas } from "../../../../../schemas/requests.js";
import { requestWriteSchema } from "../../schema.js";

export const inputSchema = requestWriteSchema.extend({
	documents: controllerSchemas.addDocuments.body.shape.documents,
});
