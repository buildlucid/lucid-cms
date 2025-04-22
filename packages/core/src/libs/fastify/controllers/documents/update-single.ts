import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
// import { swaggerBodyBricksObj } from "../../../../schemas/collection-bricks.js";
// import { swaggerFieldObj } from "../../../../schemas/collection-fields.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import permissions from "../../middleware/permissions.js";
import type { RouteController } from "../../../../types/types.js";

const updateSingleController: RouteController<
	typeof documentsSchema.updateSingle.params,
	typeof documentsSchema.updateSingle.body,
	typeof documentsSchema.updateSingle.query
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
			documentId: Number.parseInt(request.params.id),
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
	controller: updateSingleController,
	zodSchema: documentsSchema.updateSingle,
	swaggerSchema: {
		description: "Update a single document.",
		tags: ["documents"],
		summary: "Update a single document.",
		body: {
			type: "object",
			properties: {
				publish: {
					type: "boolean",
				},
				bricks: {
					type: "array",
					// items: swaggerBodyBricksObj,
				},
				fields: {
					type: "array",
					// items: swaggerFieldObj,
				},
			},
		},
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "object",
					properties: {
						id: {
							type: "number",
						},
					},
				},
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
