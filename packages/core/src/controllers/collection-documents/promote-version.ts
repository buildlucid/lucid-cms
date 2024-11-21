import T from "../../translations/index.js";
import collectionDocumentsSchema from "../../schemas/collection-documents.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import permissions from "../../middleware/permissions.js";
import type { RouteController } from "../../types/types.js";

const promoteVersionController: RouteController<
	typeof collectionDocumentsSchema.promoteVersion.params,
	typeof collectionDocumentsSchema.promoteVersion.body,
	typeof collectionDocumentsSchema.promoteVersion.query
> = async (request, reply) => {
	// Manually run permissions middleware based on target version type
	await permissions(
		request.body.versionType === "published"
			? ["publish_content"]
			: ["update_content"],
	)(request);

	const restoreRevisionRes = await serviceWrapper(
		request.server.services.collection.document.versions.promoteVersion,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_document_promote_version_error_name"),
				message: T("route_document_promote_version_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			fromVersionId: Number.parseInt(request.params.versionId),
			userId: request.auth.id,
			documentId: Number.parseInt(request.params.id),
			collectionKey: request.params.collectionKey,
			toVersionType: request.body.versionType,
		},
	);
	if (restoreRevisionRes.error)
		throw new LucidAPIError(restoreRevisionRes.error);

	reply.status(204).send();
};

export default {
	controller: promoteVersionController,
	zodSchema: collectionDocumentsSchema.promoteVersion,
	swaggerSchema: {
		description: "Promote a single document version to a new version type.",
		tags: ["collection-documents"],
		summary: "Promote a single document version to a new version type.",
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
