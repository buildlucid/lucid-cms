import {
	controllerSchemas,
	requestTypeSchema,
} from "../../../../schemas/requests.js";
import { requestDetailsSchema, requestWriteSchema } from "../schema.js";

export const inputSchema = requestDetailsSchema.extend({
	actor: requestWriteSchema.shape.actor,
	/** Create requests are opened by `toolkit.documents.createSingle` instead. */
	type: requestTypeSchema.exclude(["create"]),
	documents: controllerSchemas.createSingle.body.shape.documents,
});
