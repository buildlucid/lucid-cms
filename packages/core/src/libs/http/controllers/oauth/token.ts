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
import { uniqueOAuthParameters } from "../../utils/oauth.js";

const factory = createFactory();

const tokenController = factory.createHandlers(
	describeRoute({
		description:
			"Exchanges an authorization code or rotating refresh token for OAuth tokens.",
		tags: ["oauth"],
		summary: "Exchange OAuth Token",
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
			const error = {
				type: "validation",
				code: "invalid_request",
				status: 400,
			} as const;
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status(error.status);
			return c.json(oauthFormatter.formatError(error));
		}

		const parameters = uniqueOAuthParameters(
			new URLSearchParams(await c.req.text()),
		);
		const parsed = oauthSchemas.token.form.safeParse(parameters);
		if (!parsed.success) {
			const grantType = parameters?.grant_type;
			const error = {
				type: "validation",
				code:
					grantType &&
					grantType !== "authorization_code" &&
					grantType !== "refresh_token"
						? "unsupported_grant_type"
						: "invalid_request",
				status: 400,
			} as const;
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status(error.status);
			return c.json(oauthFormatter.formatError(error));
		}

		const context = createServiceContext(c);
		const result =
			parsed.data.grant_type === "authorization_code"
				? await serviceWrapper(oauthServices.exchangeAuthorizationCode, {
						transaction: true,
						defaultError: { type: "authorisation" },
					})(context, {
						code: parsed.data.code,
						clientId: parsed.data.client_id,
						redirectUri: parsed.data.redirect_uri,
						resource: parsed.data.resource,
						codeVerifier: parsed.data.code_verifier,
					})
				: await serviceWrapper(oauthServices.refreshAccessToken, {
						transaction: true,
						defaultError: { type: "authorisation" },
					})(context, {
						refreshToken: parsed.data.refresh_token,
						clientId: parsed.data.client_id,
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
