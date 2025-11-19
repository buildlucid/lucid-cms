import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import { documentServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";

const factory = createFactory();

const getMultipleRevisionsController = factory.createHandlers(
	describeRoute({
		description: "Get multiple revisions entries for a document.",
		tags: ["documents"],
		summary: "Get Multiple Revisions",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultipleRevisions.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getMultipleRevisions.params,
			query: controllerSchemas.getMultipleRevisions.query.string,
		}),
		validateResponse: true,
	}),
	authenticate,
	validate("param", controllerSchemas.getMultipleRevisions.params),
	validate("query", controllerSchemas.getMultipleRevisions.query.string),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");

		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultipleRevisions.query.formatted,
		);

		const documentRevisions = await serviceWrapper(
			documentServices.getMultipleRevisions,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_document_revision_fetch_error_name"),
					message: T("route_document_revision_fetch_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				collectionKey,
				documentId: Number.parseInt(id),
				query: formattedQuery,
			},
		);
		if (documentRevisions.error)
			throw new LucidAPIError(documentRevisions.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: documentRevisions.data.data,
				pagination: {
					count: documentRevisions.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleRevisionsController;
