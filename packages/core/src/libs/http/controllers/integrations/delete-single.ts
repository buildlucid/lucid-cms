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

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Delete an integration by ID.",
		tags: ["integrations"],
		summary: "Delete Integration",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.deleteSingle.params,
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.IntegrationDelete]),
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const deleteSingleRes = await serviceWrapper(
			integrationServices.deleteSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.integrations.delete.error.name"),
					message: copy("server:core.routes.integrations.delete.error.message"),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
			userId: null,
		});
		if (deleteSingleRes.error) throw new LucidAPIError(deleteSingleRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
