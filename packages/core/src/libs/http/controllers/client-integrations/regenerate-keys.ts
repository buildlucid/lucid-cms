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
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const regenerateKeysController = factory.createHandlers(
	describeRoute({
		description: "Regenerates the API key for the given client integration.",
		tags: ["client-integrations"],
		summary: "Regenerate Client Integration API Key",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.regenerateKeys.response),
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.regenerateKeys.params,
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.RegenerateClientIntegration]),
	validate("param", controllerSchemas.regenerateKeys.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const regenerateKeysRes = await serviceWrapper(
			clientIntegrationServices.regenerateKeys,
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
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
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
