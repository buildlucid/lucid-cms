import { minutesToMilliseconds } from "date-fns";
import { deleteCookie, getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../../constants/constants.js";
import { AuthStatesRepository } from "../../../../../libs/repositories/index.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import {
	authProviderFlowMatches,
	getAuthProviderFlowCookieName,
	getAuthProviderFlowCookieOptions,
} from "../../../../../services/auth/providers/helpers/flow-security.js";
import {
	authServices,
	userLoginServices,
} from "../../../../../services/index.js";
import urlAddPath from "../../../../../utils/helpers/url-add-path.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import buildErrorURL from "../../../utils/build-error-url.js";
import createServiceContext from "../../../utils/create-service-context.js";
import getRequestBaseUrl from "../../../utils/get-request-base-url.js";

const factory = createFactory();

const providerCallbackController = factory.createHandlers(
	describeRoute({
		description: "Handle OAuth callback from authentication provider.",
		tags: ["auth"],
		summary: "Provider Authentication Callback",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			params: controllerSchemas.providerCallback.params,
			query: controllerSchemas.providerCallback.query.string,
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", controllerSchemas.providerCallback.params),
	validate("query", controllerSchemas.providerCallback.query.string),
	async (c) => {
		const { providerKey } = c.req.valid("param");
		const query = c.req.valid("query");
		const { state } = query;
		const context = createServiceContext(c);
		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.header("Referrer-Policy", "no-referrer");
		c.header("X-Robots-Tag", "noindex, nofollow");

		const flowCookieName = getAuthProviderFlowCookieName(context, state);
		const browserState = getCookie(c, flowCookieName);
		const flowCookieOptions = getAuthProviderFlowCookieOptions(c.req.url);
		deleteCookie(c, flowCookieName, {
			path: flowCookieOptions.path,
		});

		if (!authProviderFlowMatches(browserState, state)) {
			const baseRedirectUrl = urlAddPath(
				getRequestBaseUrl(c),
				constants.authState.defaultErrorRedirectPath,
			);
			return c.redirect(
				buildErrorURL(
					baseRedirectUrl,
					{
						type: "authorisation",
						status: 400,
						name: copy("server:core.routes.callback.auth.error.name"),
						message: copy("server:core.invalid.or.expired.state.message"),
					},
					context.translate,
				),
			);
		}

		const AuthStates = new AuthStatesRepository(context.db);

		const errorRedirectURLRes = await serviceWrapper(
			authServices.providers.errorRedirectUrl,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.callback.auth.error.name"),
					message: copy("server:core.routes.callback.auth.error.message"),
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
			await AuthStates.scrubInvitationToken({ state, providerKey });
			return c.redirect(
				buildErrorURL(
					baseRedirectUrl,
					errorRedirectURLRes.error,
					context.translate,
				),
			);
		}

		const authStateRes = await serviceWrapper(
			authServices.providers.consumeState,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.callback.auth.error.name"),
					message: copy("server:core.routes.callback.auth.error.message"),
				},
			},
		)(context, { providerKey, state });
		if (authStateRes.error) {
			await AuthStates.scrubInvitationToken({ state, providerKey });
			return c.redirect(
				buildErrorURL(
					errorRedirectURLRes.data.redirectUrl,
					authStateRes.error,
					context.translate,
				),
			);
		}

		if ("error" in query) {
			await AuthStates.scrubInvitationToken({ state, providerKey });
			return c.redirect(
				buildErrorURL(
					errorRedirectURLRes.data.redirectUrl,
					{
						type: "authorisation",
						status: query.error === "access_denied" ? 403 : 400,
						name: copy("server:core.routes.callback.auth.error.name"),
						message: copy("server:core.routes.callback.auth.error.message"),
					},
					context.translate,
				),
			);
		}

		const callbackAuthRes = await serviceWrapper(
			authServices.providers.callback,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.callback.auth.error.name"),
					message: copy("server:core.routes.callback.auth.error.message"),
				},
			},
		)(context, {
			providerKey,
			code: query.code,
			authState: authStateRes.data,
		});
		if (callbackAuthRes.error) {
			await AuthStates.scrubInvitationToken({ state, providerKey });
			return c.redirect(
				buildErrorURL(
					errorRedirectURLRes.data.redirectUrl,
					callbackAuthRes.error,
					context.translate,
				),
			);
		}

		if (callbackAuthRes.data.grantAuthentication) {
			const [refreshRes, accessRes] = await Promise.all([
				authServices.refreshToken.generateToken(c, callbackAuthRes.data.userId),
				authServices.accessToken.generateToken(c, callbackAuthRes.data.userId),
			]);
			if (refreshRes.error) {
				await AuthStates.scrubInvitationToken({ state, providerKey });
				return c.redirect(
					buildErrorURL(
						errorRedirectURLRes.data.redirectUrl,
						refreshRes.error,
						context.translate,
					),
				);
			}
			if (accessRes.error) {
				await AuthStates.scrubInvitationToken({ state, providerKey });
				return c.redirect(
					buildErrorURL(
						errorRedirectURLRes.data.redirectUrl,
						accessRes.error,
						context.translate,
					),
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
						name: copy("server:core.routes.login.error.name"),
						message: copy("server:core.routes.login.error.message"),
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
				await AuthStates.scrubInvitationToken({ state, providerKey });
				return c.redirect(
					buildErrorURL(
						errorRedirectURLRes.data.redirectUrl,
						userLoginTrackRes.error,
						context.translate,
					),
				);
			}
		}

		await AuthStates.scrubInvitationToken({ state, providerKey });
		return c.redirect(callbackAuthRes.data.redirectUrl);
	},
);

export default providerCallbackController;
