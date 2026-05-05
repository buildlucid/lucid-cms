import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/publish-requests.js";
import { documentPublishOperationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Get publish requests.",
		tags: ["publish-requests"],
		summary: "Get Publish Requests",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate,
	permissions([Permissions.DocumentsReview]),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const requests = await serviceWrapper(
			documentPublishOperationServices.getMultiple,
			{
				transaction: false,
			},
		)(context, {
			user: c.get("auth"),
			query: formattedQuery,
		});
		if (requests.error) throw new LucidAPIError(requests.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: requests.data.data,
				pagination: {
					count: requests.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
