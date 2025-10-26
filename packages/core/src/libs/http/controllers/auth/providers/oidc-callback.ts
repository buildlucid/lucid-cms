import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { z } from "zod/v4";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import services from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import validate from "../../../middleware/validate.js";

const factory = createFactory();

const providerOIDCCallbackController = factory.createHandlers(
	describeRoute({
		description: "Handle OAuth callback from authentication provider.",
		tags: ["auth"],
		summary: "OIDC Provider Authentication Callback",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.providerOIDCCallback.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.providerOIDCCallback.params,
			query: controllerSchemas.providerOIDCCallback.query.string,
		}),
		validateResponse: true,
	}),
	validate("param", controllerSchemas.providerOIDCCallback.params),
	validate("query", controllerSchemas.providerOIDCCallback.query.string),
	async (c) => {
		const { providerKey } = c.req.valid("param");
		const { code, state } = c.req.valid("query");

		const callbackAuthRes = await serviceWrapper(
			services.auth.providers.oidcCallback,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_callback_auth_error_name"),
					message: T("route_callback_auth_error_message"),
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
				code,
				state,
			},
		);
		if (callbackAuthRes.error) throw new LucidAPIError(callbackAuthRes.error);

		// TODO: if successful, redirect the user based on the redirectUrl and set a access/refresh token

		c.status(200);
		return c.json({
			data: callbackAuthRes.data,
		});
	},
);

export default providerOIDCCallbackController;
