import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { response, headers } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import permissions from "../../middleware/permissions.js";
import type { RouteController } from "../../../../types/types.js";

const promoteVersionController: RouteController<
	typeof controllerSchemas.promoteVersion.params,
	typeof controllerSchemas.promoteVersion.body,
	typeof controllerSchemas.promoteVersion.query.string,
	typeof controllerSchemas.promoteVersion.query.formatted
> = async (request, reply) => {
	// Manually run permissions middleware based on target version type
	await permissions(
		request.body.versionType === "published"
			? ["publish_content"]
			: ["update_content"],
	)(request);

	const restoreRevisionRes = await serviceWrapper(
		request.server.services.collection.documentVersions.promoteVersion,
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
	zodSchema: controllerSchemas.promoteVersion,
	swaggerSchema: {
		description: "Promote a document version to a new version type.",
		tags: ["documents"],
		summary: "Promote Document Version",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(controllerSchemas.promoteVersion.query.string),
		body: z.toJSONSchema(controllerSchemas.promoteVersion.body),
		params: z.toJSONSchema(controllerSchemas.promoteVersion.params),
		response: response({
			// schema: z.toJSONSchema(controllerSchemas.promoteVersion.response),
			noProperties: true,
		}),
	},
};
