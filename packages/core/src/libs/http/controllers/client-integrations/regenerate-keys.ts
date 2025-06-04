import z from "zod";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/client-integrations.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerParamaters,
	honoSwaggerResponse,
} from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";

const factory = createFactory();

const regenerateKeysController = factory.createHandlers(
	describeRoute({
		description: "Regenerates the API key for the given client integration.",
		tags: ["client-integrations"],
		summary: "Regenerate Client Integration API Key",
		responses: honoSwaggerResponse({
			schema: z.toJSONSchema(controllerSchemas.regenerateKeys.response),
		}),
		parameters: honoSwaggerParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.regenerateKeys.params,
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	validate("param", controllerSchemas.regenerateKeys.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const regenerateKeysRes = await serviceWrapper(
			services.clientIntegrations.regenerateKeys,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_client_integrations_update_error_name"),
					message: T("route_client_integrations_update_error_message"),
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
		if (regenerateKeysRes.error)
			throw new LucidAPIError(regenerateKeysRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: regenerateKeysRes.data,
			}),
		);
	},
);

export default regenerateKeysController;
