import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/integrations.js";
import { integrationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateSingleController = factory.createHandlers(
	describeRoute({
		description: "Update an integration.",
		tags: ["integrations"],
		summary: "Update Integration",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateSingle.body),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.updateSingle.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationUpdate]),
	validate("json", controllerSchemas.updateSingle.body),
	validate("param", controllerSchemas.updateSingle.params),
	async (c) => {
		const { name, description, enabled, expiry, scopes } = c.req.valid("json");
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const updateSingleRes = await serviceWrapper(
			integrationServices.updateSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.integrations.update.error.name"),
					message: copy("server:core.routes.integrations.update.error.message"),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
			name,
			description,
			enabled,
			expiry,
			scopes,
			userId: null,
		});
		if (updateSingleRes.error) throw new LucidAPIError(updateSingleRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateSingleController;
