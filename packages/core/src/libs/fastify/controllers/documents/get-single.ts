import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { swaggerResponse } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";
import type { DocumentVersionType } from "../../..//db/types.js";

const getSingleController: RouteController<
	typeof controllerSchemas.getSingle.params,
	typeof controllerSchemas.getSingle.body,
	typeof controllerSchemas.getSingle.query.string,
	typeof controllerSchemas.getSingle.query.formatted
> = async (request, reply) => {
	const hasStatus =
		request.params.statusOrId === "draft" ||
		request.params.statusOrId === "published";

	const document = await serviceWrapper(
		request.server.services.collection.documents.getSingle,
		{
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_document_fetch_error_name"),
				message: T("route_document_fetch_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id),
			status: hasStatus
				? (request.params.statusOrId as DocumentVersionType)
				: undefined,
			versionId: !hasStatus
				? Number.parseInt(request.params.statusOrId)
				: undefined,
			collectionKey: request.params.collectionKey,
			query: request.formattedQuery,
		},
	);
	if (document.error) throw new LucidAPIError(document.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: document.data,
		}),
	);
};

export default {
	controller: getSingleController,
	zodSchema: controllerSchemas.getSingle,
	swaggerSchema: {
		description: "Get a single document from the collection key and ID.",
		tags: ["documents"],
		summary: "Get Document",

		querystring: z.toJSONSchema(controllerSchemas.getSingle.query.string),
		params: z.toJSONSchema(controllerSchemas.getSingle.params),
		response: swaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
	},
};
