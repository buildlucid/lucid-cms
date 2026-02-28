import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { clientIntegrationServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getScopesController = factory.createHandlers(
	describeRoute({
		description:
			"Returns all available client integration scopes grouped by key.",
		tags: ["client-integrations"],
		summary: "Get Client Integration Scopes",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getScopes.response),
		}),
	}),
	authenticate,
	permissions([Permissions.IntegrationRead]),
	async (c) => {
		const context = getServiceContext(c);
		const getScopesRes = await serviceWrapper(
			clientIntegrationServices.getScopes,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_client_integrations_fetch_error_name"),
					message: T("route_client_integrations_fetch_error_message"),
				},
			},
		)(context);
		if (getScopesRes.error) throw new LucidAPIError(getScopesRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: getScopesRes.data,
			}),
		);
	},
);

export default getScopesController;
