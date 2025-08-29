import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";

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
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const deleteSingleRes = await serviceWrapper(
			services.clientIntegrations.deleteSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_client_integrations_delete_error_name"),
					message: T("route_client_integrations_delete_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				id: Number.parseInt(id),
			},
		);
		if (deleteSingleRes.error) throw new LucidAPIError(deleteSingleRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
