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

const revokeController = factory.createHandlers(
	describeRoute({
		description: "Revokes an OAuth refresh token and its connection.",
		tags: ["oauth"],
		summary: "Revoke OAuth Token",
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
					schema: openAPI.schema(oauthSchemas.revoke.form),
				},
			},
		},
		responses: {
			200: {
				description: "The revocation request was accepted.",
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
		scope: "oauth-revoke",
		windowMs: minutesToMilliseconds(1),
	}),
	async (c: LucidHonoContext) => {
		const context = createServiceContext(c);
		const contentType = c.req
			.header("content-type")
			?.split(";")[0]
			?.trim()
			.toLowerCase();
		const parameters =
			contentType === "application/x-www-form-urlencoded"
				? uniqueOAuthParameters(new URLSearchParams(await c.req.text()))
				: undefined;
		const parsed = oauthSchemas.revoke.form.safeParse(parameters);
		if (!parsed.success) {
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

		const credentials = parseOAuthClientCredentials(
			c.req.header("Authorization"),
			parsed.data.client_id,
		);
		if (!credentials) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.header("WWW-Authenticate", 'Basic realm="oauth-revoke"');
			c.status(401);
			return c.json(
				oauthFormatter.formatError({
					type: "authorisation",
					code: "invalid_client",
					status: 401,
				}),
			);
		}

		const clientRes = await serviceWrapper(oauthServices.authenticateClient, {
			transaction: false,
			defaultError: { type: "authorisation" },
		})(context, credentials);
		if (clientRes.error) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			if (clientRes.error.code === "invalid_client") {
				c.header("WWW-Authenticate", 'Basic realm="oauth-revoke"');
			}
			c.status((clientRes.error.status ?? 500) as StatusCode);
			return c.json(oauthFormatter.formatError(clientRes.error));
		}

		const result = await serviceWrapper(oauthServices.revokeToken, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, {
			token: parsed.data.token,
			clientId: clientRes.data.clientId,
		});
		if (result.error) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status((result.error.status ?? 500) as StatusCode);
			return c.json(oauthFormatter.formatError(result.error));
		}

		c.header("Cache-Control", "no-store");
		return c.body(null, 200);
	},
);

export default revokeController;
