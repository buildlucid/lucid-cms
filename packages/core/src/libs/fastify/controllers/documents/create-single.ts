import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
import { swaggerBodyBricksObj } from "../../../../schemas/collection-bricks.js";
import { swaggerFieldObj } from "../../../../schemas/collection-fields.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import permissions from "../../middleware/permissions.js";
import type { RouteController } from "../../../../types/types.js";

const createSingleController: RouteController<
	typeof documentsSchema.createSingle.params,
	typeof documentsSchema.createSingle.body,
	typeof documentsSchema.createSingle.query
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
		description: "Create a single document.",
		tags: ["documents"],
		summary: "Create a single document.",
		body: {
			type: "object",
			properties: {
				publish: {
					type: "boolean",
				},
				bricks: {
					type: "array",
					items: swaggerBodyBricksObj,
				},
				fields: {
					type: "array",
					items: swaggerFieldObj,
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
