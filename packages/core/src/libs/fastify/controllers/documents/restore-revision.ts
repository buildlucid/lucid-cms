import z from "zod";
import T from "../../../../translations/index.js";
import documentsSchema from "../../../../schemas/documents.js";
import { headers, response } from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const restoreRevisionController: RouteController<
	typeof documentsSchema.restoreRevision.params,
	typeof documentsSchema.restoreRevision.body,
	typeof documentsSchema.restoreRevision.query.string,
	typeof documentsSchema.restoreRevision.query.formatted
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
	zodSchema: documentsSchema.restoreRevision,
	swaggerSchema: {
		description: "Restore a single document revision.",
		tags: ["documents"],
		summary: "Restore Document Revision",

		headers: headers({
			csrf: true,
		}),
		// querystring: z.toJSONSchema(documentsSchema.restoreRevision.query.string),
		// body: z.toJSONSchema(documentsSchema.restoreRevision.body),
		params: z.toJSONSchema(documentsSchema.restoreRevision.params),
		response: response({
			// schema: z.toJSONSchema(documentsSchema.restoreRevision.response),
			noProperties: true,
		}),
	},
};
