import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestBodySchema, requestWriteSchema } from "../schema.js";

const { body } = controllerSchemas.updateSingle;

export const inputSchema = requestWriteSchema.extend({
	title: body.shape.title,
	/** Null removes the description. */
	description: requestBodySchema.nullable().optional(),
	/** Replaces the reviewers. People asked to review must be able to read the request. */
	reviewerIds: body.shape.reviewerIds,
});
