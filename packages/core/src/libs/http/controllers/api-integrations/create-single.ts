import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/api-integrations.js";
import { apiIntegrationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Creates an API integration that can authenticate external endpoints.",
		tags: ["api-integrations"],
		summary: "Create API Integration",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.createSingle.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createSingle.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationCreate]),
	validate("json", controllerSchemas.createSingle.body),
	async (c) => {
		const { name, description, enabled, scopes } = c.req.valid("json");
		const context = createServiceContext(c);

		const apiIntegrationRes = await serviceWrapper(
			apiIntegrationServices.createSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy(
						"server:core.routes.client.integrations.create.error.message",
					),
					message: copy(
						"server:core.routes.client.integrations.create.error.message",
					),
				},
			},
		)(context, {
			name,
			description,
			enabled,
			scopes,
		});
		if (apiIntegrationRes.error)
			throw new LucidAPIError(apiIntegrationRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: apiIntegrationRes.data,
			}),
		);
	},
);

export default createSingleController;
