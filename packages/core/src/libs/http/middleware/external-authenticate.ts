import { createMiddleware } from "hono/factory";
import { integrationServices, oauthServices } from "../../../services/index.js";
import { getOAuthUrls } from "../../../services/oauth/helpers/urls.js";
import type {
	LucidExternalAuth,
	LucidHonoContext,
} from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { integrationApiKeyPrefix } from "../../../utils/integrations/encode-api-key.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import createServiceContext from "../utils/create-service-context.js";

/** Adds the OAuth resource challenge to an unauthorized response. */
const setOAuthBearerChallenge = (
	c: LucidHonoContext,
	context: ServiceContext,
	error?: "invalid_token",
) => {
	c.header(
		"WWW-Authenticate",
		[
			`Bearer resource_metadata="${getOAuthUrls(context).protectedResourceMetadata}"`,
			error ? `error="${error}"` : undefined,
		]
			.filter(Boolean)
			.join(", "),
	);
};

/**
 * Authenticates content API requests with an integration API key or OAuth access
 * token, then exposes the resolved principal and scopes to downstream handlers.
 */
const externalAuthentication = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const authorization = c.req.header("Authorization");
		const apiKeyHeader = c.req.header("X-API-Key");
		const runtimeContext = c.get("runtimeContext");
		const connectionInfo = runtimeContext.getConnectionInfo(c);
		const userAgent = c.req.header("user-agent") || null;

		const context = createServiceContext(c);

		if ((!authorization && !apiKeyHeader) || (authorization && apiKeyHeader)) {
			setOAuthBearerChallenge(c, context);
			throw new LucidAPIError({
				type: "authorisation",
				message: copy("server:core.integrations.api.key.missing"),
				status: 401,
			});
		}

		let integrationCredential: string | undefined;
		let oauthCredential: string | undefined;

		if (apiKeyHeader) {
			integrationCredential = apiKeyHeader.trim();
		} else {
			const parts = authorization?.trim().split(/\s+/) ?? [];
			const [scheme, credential] = parts;
			if (parts.length !== 2 || !scheme || !credential) {
				setOAuthBearerChallenge(c, context);
				throw new LucidAPIError({
					type: "authorisation",
					message: copy("server:core.integrations.api.key.invalid"),
					status: 401,
				});
			}

			if (scheme.toLowerCase() === "apikey") {
				integrationCredential = credential;
			} else if (scheme.toLowerCase() === "bearer") {
				if (credential.startsWith(integrationApiKeyPrefix)) {
					integrationCredential = credential;
				} else {
					oauthCredential = credential;
				}
			}
		}

		let externalAuth: LucidExternalAuth;
		if (integrationCredential) {
			const verifyApiKey = await serviceWrapper(
				integrationServices.verifyApiKey,
				{
					transaction: false,
					defaultError: {
						type: "authorisation",
						message: copy("server:core.integrations.error"),
						status: 401,
					},
				},
			)(context, {
				apiKey: integrationCredential,
			});
			if (verifyApiKey.error) {
				throw new LucidAPIError({
					type: "authorisation",
					message: copy("server:core.integrations.api.key.invalid"),
					status: 401,
				});
			}
			externalAuth = verifyApiKey.data;
		} else if (oauthCredential) {
			const verifyAccessToken = await serviceWrapper(
				oauthServices.verifyAccessToken,
				{
					transaction: false,
					defaultError: {
						type: "authorisation",
						code: "invalid_token",
						status: 401,
					},
				},
			)(context, { accessToken: oauthCredential });
			if (verifyAccessToken.error) {
				setOAuthBearerChallenge(c, context, "invalid_token");
				throw new LucidAPIError(verifyAccessToken.error);
			}
			externalAuth = verifyAccessToken.data;
		} else {
			setOAuthBearerChallenge(c, context);
			throw new LucidAPIError({
				type: "authorisation",
				message: copy("server:core.integrations.api.key.invalid"),
				status: 401,
			});
		}

		c.set("externalAuth", externalAuth);
		const response = await next();

		if (externalAuth.credential.type === "api-key") {
			void integrationServices
				.updateLastUsed(context, {
					id: externalAuth.credential.integrationId,
					ipAddress: connectionInfo.address ?? null,
					userAgent,
				})
				.catch(() => undefined);
		} else {
			void oauthServices
				.updateLastUsed(context, {
					id: externalAuth.credential.grantId,
					ipAddress: connectionInfo.address ?? null,
					userAgent,
				})
				.catch(() => undefined);
		}

		return response;
	},
);

export default externalAuthentication;
