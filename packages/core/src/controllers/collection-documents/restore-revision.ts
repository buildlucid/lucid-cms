import T from "../../translations/index.js";
import collectionDocumentsSchema from "../../schemas/collection-documents.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const restoreRevisionController: RouteController<
	typeof collectionDocumentsSchema.restoreRevision.params,
	typeof collectionDocumentsSchema.restoreRevision.body,
	typeof collectionDocumentsSchema.restoreRevision.query
> = async (request, reply) => {
	const restoreRevisionRes = await serviceWrapper(
		request.server.services.collection.document.versions.restoreRevision,
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
	zodSchema: collectionDocumentsSchema.restoreRevision,
	swaggerSchema: {
		description: "Restore a single document revision.",
		tags: ["collection-documents"],
		summary: "Restore a single document revision.",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
