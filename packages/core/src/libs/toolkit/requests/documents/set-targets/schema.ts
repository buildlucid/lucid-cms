import { controllerSchemas } from "../../../../../schemas/requests.js";
import { requestDocumentSchema } from "../../schema.js";

export const inputSchema = requestDocumentSchema.extend({
	/** Replaces the document's targets. */
	targets: controllerSchemas.updateTargets.body.shape.targets,
});
