import { z } from "zod/v4";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import services from "../../../../../services/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import T from "../../../../../translations/index.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";

const factory = createFactory();

const initiateAuthController = factory.createHandlers(
	describeRoute({
		description: "Initiate authentication with a provider.",
		tags: ["auth"],
		summary: "Initiate Provider Authentication",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.initiateAuth.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.initiateAuth.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.initiateAuth.body),
		validateResponse: true,
	}),
	validateCSRF,
	validate("param", controllerSchemas.initiateAuth.params),
	validate("json", controllerSchemas.initiateAuth.body),
	async (c) => {
		const { providerKey } = c.req.valid("param");
		const { invitationToken } = c.req.valid("json");

		const initiateAuthRes = await serviceWrapper(
			services.auth.providers.initiateAuth,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_initiate_auth_error_name"),
					message: T("route_initiate_auth_error_message"),
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
				providerKey,
				invitationToken,
			},
		);
		if (initiateAuthRes.error) throw new LucidAPIError(initiateAuthRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: initiateAuthRes.data,
			}),
		);
	},
);

export default initiateAuthController;
