import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/documents.js";
import {
	swaggerHeaders,
	swaggerResponse,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const restoreRevisionController: RouteController<
	typeof controllerSchemas.restoreRevision.params,
	typeof controllerSchemas.restoreRevision.body,
	typeof controllerSchemas.restoreRevision.query.string,
	typeof controllerSchemas.restoreRevision.query.formatted
> = async (request, reply) => {
	const restoreRevisionRes = await serviceWrapper(
		request.server.services.collection.documentVersions.restoreRevision,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_document_restore_revision_error_name"),
				message: T("route_document_restore_revision_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			versionId: Number.parseInt(request.params.versionId),
			userId: request.auth.id,
			documentId: Number.parseInt(request.params.id),
			collectionKey: request.params.collectionKey,
		},
	);
	if (restoreRevisionRes.error)
		throw new LucidAPIError(restoreRevisionRes.error);

	reply.status(204).send();
};

export default {
	controller: restoreRevisionController,
	zodSchema: controllerSchemas.restoreRevision,
	swaggerSchema: {
		description: "Restore a single document revision.",
		tags: ["documents"],
		summary: "Restore Document Revision",

		headers: swaggerHeaders({
			csrf: true,
		}),
		params: z.toJSONSchema(controllerSchemas.restoreRevision.params),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
