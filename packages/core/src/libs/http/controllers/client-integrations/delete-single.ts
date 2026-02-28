import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { clientIntegrationServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
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
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Delete a single client integration by ID.",
		tags: ["client-integrations"],
		summary: "Delete Client Integration",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.deleteSingle.params,
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.IntegrationDelete]),
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const deleteSingleRes = await serviceWrapper(
			clientIntegrationServices.deleteSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_client_integrations_delete_error_name"),
					message: T("route_client_integrations_delete_error_message"),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
		});
		if (deleteSingleRes.error) throw new LucidAPIError(deleteSingleRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
