import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { clientIntegrationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { text } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateSingleController = factory.createHandlers(
	describeRoute({
		description: "Update a single client integration.",
		tags: ["client-integrations"],
		summary: "Update Client Integration",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateSingle.body),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.updateSingle.params,
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.IntegrationUpdate]),
	validate("json", controllerSchemas.updateSingle.body),
	validate("param", controllerSchemas.updateSingle.params),
	async (c) => {
		const { name, description, enabled, scopes } = c.req.valid("json");
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const updateSingleRes = await serviceWrapper(
			clientIntegrationServices.updateSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: text.server(
						"core.routes.client.integrations.update.error.message",
					),
					message: text.server(
						"core.routes.client.integrations.update.error.message",
					),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
			name,
			description,
			enabled,
			scopes,
		});
		if (updateSingleRes.error) throw new LucidAPIError(updateSingleRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSingleController;
