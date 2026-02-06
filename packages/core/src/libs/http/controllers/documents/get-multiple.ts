import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description:
			"Get a multiple document entries for a given collection and status (version type).",
		tags: ["documents"],
		summary: "Get Multiple Documents",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getMultiple.params,
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate,
	validate("param", controllerSchemas.getMultiple.params),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const { collectionKey, status } = c.req.valid("param");
		const context = getServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const documents = await serviceWrapper(documentServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_document_fetch_error_name"),
				message: T("route_document_fetch_error_message"),
			},
		})(context, {
			collectionKey,
			status,
			query: formattedQuery,
		});
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
