import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import type { StatusCode } from "hono/utils/http-status";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import {
	oauthErrorResponseSchema,
	oauthSchemas,
} from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { oauthFormatter } from "../../../formatters/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";
import {
	parseOAuthClientCredentials,
	uniqueOAuthParameters,
} from "../../utils/oauth.js";

const factory = createFactory();

const tokenController = factory.createHandlers(
	describeRoute({
		description:
			"Exchanges an authorization code or rotating refresh token for OAuth tokens.",
		tags: ["oauth"],
		summary: "Exchange OAuth Token",
		parameters: [
			{
				in: "header",
				name: "Authorization",
				required: false,
				description:
					"Confidential clients authenticate with HTTP Basic using their client ID and client secret. Public clients send client_id in the form body.",
				schema: {
					type: "string",
				},
			},
		],
		requestBody: {
			required: true,
			content: {
				"application/x-www-form-urlencoded": {
					schema: openAPI.schema(oauthSchemas.token.form),
				},
			},
		},
		responses: {
			200: {
				description: "OAuth access and refresh tokens.",
				content: {
					"application/json": {
						schema: openAPI.schema(oauthSchemas.token.response),
					},
				},
			},
			default: {
				description: "OAuth protocol error.",
				content: {
					"application/json": {
						schema: openAPI.schema(oauthErrorResponseSchema),
					},
				},
			},
		},
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: "oauth-token",
		windowMs: minutesToMilliseconds(1),
	}),
	async (c: LucidHonoContext) => {
		const contentType = c.req
			.header("content-type")
			?.split(";")[0]
			?.trim()
			.toLowerCase();
		if (contentType !== "application/x-www-form-urlencoded") {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status(400);
			return c.json(
				oauthFormatter.formatError({
					type: "validation",
					code: "invalid_request",
					status: 400,
				}),
			);
		}

		const parameters = uniqueOAuthParameters(
			new URLSearchParams(await c.req.text()),
		);
		const parsed = oauthSchemas.token.form.safeParse(parameters);
		if (!parsed.success) {
			const grantType = parameters?.grant_type;
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status(400);
			return c.json(
				oauthFormatter.formatError({
					type: "validation",
					code:
						grantType &&
						grantType !== "authorization_code" &&
						grantType !== "refresh_token"
							? "unsupported_grant_type"
							: "invalid_request",
					status: 400,
				}),
			);
		}

		const credentials = parseOAuthClientCredentials(
			c.req.header("Authorization"),
			parsed.data.client_id,
		);
		if (!credentials) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.header("WWW-Authenticate", 'Basic realm="oauth-token"');
			c.status(401);
			return c.json(
				oauthFormatter.formatError({
					type: "authorisation",
					code: "invalid_client",
					status: 401,
				}),
			);
		}

		const context = createServiceContext(c);
		const clientRes = await serviceWrapper(oauthServices.authenticateClient, {
			transaction: false,
			defaultError: { type: "authorisation" },
		})(context, credentials);
		if (clientRes.error) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			if (clientRes.error.code === "invalid_client") {
				c.header("WWW-Authenticate", 'Basic realm="oauth-token"');
			}
			c.status((clientRes.error.status ?? 500) as StatusCode);
			return c.json(oauthFormatter.formatError(clientRes.error));
		}

		const result =
			parsed.data.grant_type === "authorization_code"
				? await serviceWrapper(oauthServices.exchangeAuthorizationCode, {
						transaction: true,
						defaultError: { type: "authorisation" },
					})(context, {
						code: parsed.data.code,
						clientId: clientRes.data.clientId,
						redirectUri: parsed.data.redirect_uri,
						resource: parsed.data.resource,
						codeVerifier: parsed.data.code_verifier,
					})
				: await serviceWrapper(oauthServices.refreshAccessToken, {
						transaction: true,
						defaultError: { type: "authorisation" },
					})(context, {
						refreshToken: parsed.data.refresh_token,
						clientId: clientRes.data.clientId,
						resource: parsed.data.resource,
					});
		if (result.error) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status((result.error.status ?? 500) as StatusCode);
			return c.json(oauthFormatter.formatError(result.error));
		}

		c.header("Cache-Control", "no-store");
		c.header("Pragma", "no-cache");
		return c.json(result.data);
	},
);

export default tokenController;
