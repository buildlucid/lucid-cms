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
	honoSwaggerResponse,
	honoSwaggerParamaters,
} from "../../../../../utils/swagger/index.js";
import validate from "../../../middleware/validate.js";
import buildFormattedQuery from "../../../utils/build-formatted-query.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description:
			"Get multiple documents by filters via the client integration.",
		tags: ["client-documents"],
		summary: "Get Multiple Documents",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getMultiple.response),
			paginated: true,
		}),
		parameters: honoSwaggerParamaters({
			params: controllerSchemas.client.getMultiple.params,
			query: controllerSchemas.client.getMultiple.query.string,
			headers: {
				authorization: true,
				clientKey: true,
			},
		}),
		validateResponse: true,
	}),
	clientAuthentication,
	validate("param", controllerSchemas.client.getMultiple.params),
	validate("query", controllerSchemas.client.getMultiple.query.string),
	async (c) => {
		const { collectionKey, status } = c.req.valid("param");
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.client.getMultiple.query.formatted,
		);

		const documents = await serviceWrapper(
			services.collection.documents.client.getMultiple,
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
				services: services,
			},
			{
				collectionKey,
				status,
				query: formattedQuery,
			},
		);
		if (documents.error) throw new LucidAPIError(documents.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: documents.data.data,
				pagination: {
					count: documents.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
