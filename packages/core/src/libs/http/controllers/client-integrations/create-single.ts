import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { clientIntegrationServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Creates a new client integration that can be used to authenticate client endpoints.",
		tags: ["client-integrations"],
		summary: "Create Client Integration",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.IntegrationCreate]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const { name, description, enabled, scopes } = c.req.valid("json");
		const context = getServiceContext(c);

		const clientIntegrationRes = await serviceWrapper(
			clientIntegrationServices.createSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_client_integrations_create_error_name"),
					message: T("route_client_integrations_create_error_message"),
				},
			},
		)(context, {
			name,
			description,
			enabled,
			scopes,
		});
		if (clientIntegrationRes.error)
			throw new LucidAPIError(clientIntegrationRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: clientIntegrationRes.data,
			}),
		);
	},
);

export default createSingleController;
