import z from "zod/v4";
import T from "../../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../../schemas/documents.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../../services/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../../utils/open-api/index.js";
import validate from "../../../middleware/validate.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single document by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Document",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.client.getSingle.params,
			query: controllerSchemas.client.getSingle.query.string,
			headers: {
				authorization: true,
				clientKey: true,
			},
		}),
		validateResponse: true,
	}),
	clientAuthentication,
	validate("param", controllerSchemas.client.getSingle.params),
	validate("query", controllerSchemas.client.getSingle.query.string),
	async (c) => {
		const { collectionKey, status } = c.req.valid("param");
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.client.getSingle.query.formatted,
		);

		const document = await serviceWrapper(
			services.collection.documents.client.getSingle,
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
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
			},
			{
				collectionKey,
				status,
				query: formattedQuery,
			},
		);
		if (document.error) throw new LucidAPIError(document.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: document.data,
			}),
		);
	},
);

export default getSingleController;
