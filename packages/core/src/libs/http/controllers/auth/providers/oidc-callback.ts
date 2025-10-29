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
import constants from "../../../../../constants/constants.js";
import urlAddPath from "../../../../../utils/helpers/url-add-path.js";
import buildErrorURL from "../../../utils/build-error-url.js";

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

		const baseRedirectUrl = urlAddPath(
			c.get("config").host,
			constants.authState.defaultRedirectPath,
		);

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
		if (callbackAuthRes.error) {
			return c.redirect(buildErrorURL(baseRedirectUrl, callbackAuthRes.error));
		}

		if (callbackAuthRes.data.grantAuthentication) {
			const [refreshRes, accessRes] = await Promise.all([
				services.auth.refreshToken.generateToken(
					c,
					callbackAuthRes.data.userId,
				),
				services.auth.accessToken.generateToken(c, callbackAuthRes.data.userId),
			]);
			if (refreshRes.error) {
				return c.redirect(
					buildErrorURL(callbackAuthRes.data.redirectUrl, refreshRes.error),
				);
			}
			if (accessRes.error) {
				return c.redirect(
					buildErrorURL(callbackAuthRes.data.redirectUrl, accessRes.error),
				);
			}

			const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);
			const userAgent = c.req.header("user-agent") || null;

			const userLoginTrackRes = await serviceWrapper(
				services.userLogins.createSingle,
				{
					transaction: false,
					defaultError: {
						type: "basic",
						name: T("route_login_error_name"),
						message: T("route_login_error_message"),
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
					userId: callbackAuthRes.data.userId,
					tokenId: refreshRes.data.tokenId,
					authMethod: providerKey,
					ipAddress: connectionInfo.address ?? null,
					userAgent: userAgent,
				},
			);
			if (userLoginTrackRes.error) {
				return c.redirect(
					buildErrorURL(
						callbackAuthRes.data.redirectUrl,
						userLoginTrackRes.error,
					),
				);
			}
		}

		return c.redirect(callbackAuthRes.data.redirectUrl);
	},
);

export default providerOIDCCallbackController;
