import z from "zod";
import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import permissions from "../../middleware/permissions.js";
import type { RouteController } from "../../../../types/types.js";

const createSingleController: RouteController<
	typeof documentsSchema.createSingle.params,
	typeof documentsSchema.createSingle.body,
	typeof documentsSchema.createSingle.query.string,
	typeof documentsSchema.createSingle.query.formatted
> = async (request, reply) => {
	//* manually run permissions middleware based on the publish flag
	await permissions(
		request.body.publish ? ["publish_content"] : ["create_content"],
	)(request);

	const documentId = await serviceWrapper(
		request.server.services.collection.documents.upsertSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_document_create_error_name"),
				message: T("route_document_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			collectionKey: request.params.collectionKey,
			publish: request.body.publish,
			userId: request.auth.id,
			bricks: request.body.bricks,
			fields: request.body.fields,
		},
	);
	if (documentId.error) throw new LucidAPIError(documentId.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: {
				id: documentId.data,
			},
		}),
	);
};

export default {
	controller: createSingleController,
	zodSchema: documentsSchema.createSingle,
	swaggerSchema: {
		description: "Create a single document for a given collection.",
		tags: ["documents"],
		summary: "Create Document",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(documentsSchema.createSingle.query.string),
		body: z.toJSONSchema(documentsSchema.createSingle.body),
		params: z.toJSONSchema(documentsSchema.createSingle.params),
		response: response({
			schema: z.toJSONSchema(documentsSchema.createSingle.response),
		}),
	},
};
