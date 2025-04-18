import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const deleteMultipleController: RouteController<
	typeof documentsSchema.deleteMultiple.params,
	typeof documentsSchema.deleteMultiple.body,
	typeof documentsSchema.deleteMultiple.query
> = async (request, reply) => {
	const deleteMultiple = await serviceWrapper(
		request.server.services.collection.documents.deleteMultiple,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_document_delete_error_name"),
				message: T("route_document_delete_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			ids: request.body.ids,
			collectionKey: request.params.collectionKey,
			userId: request.auth.id,
		},
	);
	if (deleteMultiple.error) throw new LucidAPIError(deleteMultiple.error);

	reply.status(204).send();
};

export default {
	controller: deleteMultipleController,
	zodSchema: documentsSchema.deleteMultiple,
	swaggerSchema: {
		description: "Delete a multiple collection documents.",
		tags: ["documents"],
		summary: "Delete multiple collection documents.",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		body: {
			type: "object",
			properties: {
				ids: {
					type: "array",
					items: {
						type: "number",
					},
				},
			},
			required: ["ids"],
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
