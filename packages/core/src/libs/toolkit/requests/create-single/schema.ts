import z from "zod";
import { controllerSchemas } from "../../../../schemas/requests.js";
import { requestTypeSchema } from "../../../db/tables/requests.js";
import { requestBodySchema, requestWriteSchema } from "../schema.js";

const { body } = controllerSchemas.createSingle;

export const inputSchema = z.strictObject({
	actor: requestWriteSchema.shape.actor,
	/** Create requests are opened by `toolkit.documents.createSingle` instead. */
	type: requestTypeSchema.exclude(["create"]),
	title: body.shape.title,
	description: requestBodySchema.optional(),
	documents: body.shape.documents,
	/** People asked to review, who must be able to read the request. */
	reviewerIds: body.shape.reviewerIds,
});
