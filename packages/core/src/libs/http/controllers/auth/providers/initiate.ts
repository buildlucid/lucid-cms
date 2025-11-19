import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { z } from "zod/v4";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import validate from "../../../middleware/validate.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import formatAPIResponse from "../../../utils/build-response.js";
import softAuthenticate from "../../../middleware/soft-authenticate.js";

const factory = createFactory();

const providerInitiateController = factory.createHandlers(
	describeRoute({
		description:
			"Handle oidc auth initiation. Creates auth state and redirects to provider login page",
		tags: ["auth"],
		summary: "Initiate Provider Authentication",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.providerInitiate.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.providerInitiate.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.providerInitiate.body,
		),
		validateResponse: true,
	}),
	validateCSRF,
	softAuthenticate,
	validate("param", controllerSchemas.providerInitiate.params),
	validate("json", controllerSchemas.providerInitiate.body),
	async (c) => {
		const { providerKey } = c.req.valid("param");
		const { invitationToken, redirectPath, actionType } = c.req.valid("json");

		const initiateAuthRes = await serviceWrapper(
			authServices.providers.initiate,
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
				redirectPath,
				actionType,
				authenticatedUserId: c.get("auth")?.id,
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

export default providerInitiateController;
