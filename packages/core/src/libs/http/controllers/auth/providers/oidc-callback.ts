import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../../constants/constants.js";
import { AuthStatesRepository } from "../../../../../libs/repositories/index.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import {
	authServices,
	userLoginServices,
} from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import urlAddPath from "../../../../../utils/helpers/url-add-path.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validate from "../../../middleware/validate.js";
import buildErrorURL from "../../../utils/build-error-url.js";
import getRequestBaseUrl from "../../../utils/get-request-base-url.js";
import getServiceContext from "../../../utils/get-service-context.js";

const factory = createFactory();

const providerOIDCCallbackController = factory.createHandlers(
	describeRoute({
		description: "Handle OAuth callback from authentication provider.",
		tags: ["auth"],
		summary: "OIDC Provider Authentication Callback",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.providerOIDCCallback.params,
			query: controllerSchemas.providerOIDCCallback.query.string,
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", controllerSchemas.providerOIDCCallback.params),
	validate("query", controllerSchemas.providerOIDCCallback.query.string),
	async (c) => {
		const { providerKey } = c.req.valid("param");
		const { code, state } = c.req.valid("query");
		const context = getServiceContext(c);
		const AuthStates = new AuthStatesRepository(
			context.db.client,
			context.config.db,
		);

		//* scrub so callback redirect behavior is preserved even if this fails.
		const scrubInvitationToken = async () => {
			await AuthStates.updateMultiple({
				data: {
					invitation_token: null,
				},
				where: [
					{
						key: "state",
						operator: "=",
						value: state,
					},
					{
						key: "provider_key",
						operator: "=",
						value: providerKey,
					},
				],
			});
		};

		const errorRedirectURLRes = await serviceWrapper(
			authServices.providers.errorRedirectUrl,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_callback_auth_error_name"),
					message: T("route_callback_auth_error_message"),
				},
			},
		)(context, {
			providerKey,
			state,
		});
		if (errorRedirectURLRes.error) {
			const baseRedirectUrl = urlAddPath(
				getRequestBaseUrl(c),
				constants.authState.defaultRedirectPath,
			);
			await scrubInvitationToken();
			return c.redirect(
				buildErrorURL(baseRedirectUrl, errorRedirectURLRes.error),
			);
		}

		const callbackAuthRes = await serviceWrapper(
			authServices.providers.oidcCallback,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_callback_auth_error_name"),
					message: T("route_callback_auth_error_message"),
				},
			},
		)(context, {
			providerKey,
			code,
			state,
		});
		if (callbackAuthRes.error) {
			await scrubInvitationToken();
			return c.redirect(
				buildErrorURL(
					errorRedirectURLRes.data.redirectUrl,
					callbackAuthRes.error,
				),
			);
		}

		if (callbackAuthRes.data.grantAuthentication) {
			const [refreshRes, accessRes] = await Promise.all([
				authServices.refreshToken.generateToken(c, callbackAuthRes.data.userId),
				authServices.accessToken.generateToken(c, callbackAuthRes.data.userId),
			]);
			if (refreshRes.error) {
				await scrubInvitationToken();
				return c.redirect(
					buildErrorURL(errorRedirectURLRes.data.redirectUrl, refreshRes.error),
				);
			}
			if (accessRes.error) {
				await scrubInvitationToken();
				return c.redirect(
					buildErrorURL(errorRedirectURLRes.data.redirectUrl, accessRes.error),
				);
			}

			const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);
			const userAgent = c.req.header("user-agent") || null;

			const userLoginTrackRes = await serviceWrapper(
				userLoginServices.createSingle,
				{
					transaction: false,
					defaultError: {
						type: "basic",
						name: T("route_login_error_name"),
						message: T("route_login_error_message"),
					},
				},
			)(context, {
				userId: callbackAuthRes.data.userId,
				tokenId: refreshRes.data.tokenId,
				authMethod: providerKey,
				ipAddress: connectionInfo.address ?? null,
				userAgent: userAgent,
			});
			if (userLoginTrackRes.error) {
				await scrubInvitationToken();
				return c.redirect(
					buildErrorURL(
						errorRedirectURLRes.data.redirectUrl,
						userLoginTrackRes.error,
					),
				);
			}
		}

		await scrubInvitationToken();
		return c.redirect(callbackAuthRes.data.redirectUrl);
	},
);

export default providerOIDCCallbackController;
