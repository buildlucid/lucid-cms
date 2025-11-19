import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { describeRoute } from "hono-openapi";
import { clientIntegrationServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIRequestBody,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

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
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateClientIntegration]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const { name, description, enabled } = c.req.valid("json");

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
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				name,
				description,
				enabled,
			},
		);
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
