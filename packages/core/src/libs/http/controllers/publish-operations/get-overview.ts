import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/publish-operation-management.js";
import { documentPublishOperationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getOverviewController = factory.createHandlers(
	describeRoute({
		description: "Get publish operation overview counts.",
		tags: ["publish-operations"],
		summary: "Get Publish Operation Overview",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getOverview.response),
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getOverview.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.PublishOperationsRead]),
	validate("query", controllerSchemas.getOverview.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getOverview.query.formatted,
		);

		const overview = await serviceWrapper(
			documentPublishOperationServices.getOverview,
			{
				transaction: false,
			},
		)(context, {
			user: c.get("auth"),
			query: formattedQuery,
		});
		if (overview.error) throw new LucidAPIError(overview.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: overview.data,
			}),
		);
	},
);

export default getOverviewController;
