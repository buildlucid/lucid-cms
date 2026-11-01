import { controllerSchemas } from "../../../../schemas/documents.js";
import {
	documentTargetSchema,
	documentWriteSchema,
} from "../authoring-schema.js";

export const inputSchema = documentWriteSchema.extend({
	id: documentTargetSchema.shape.id,
	environment: controllerSchemas.unpublish.body.shape.environment,
});
