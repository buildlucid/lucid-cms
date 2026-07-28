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

const revokeController = factory.createHandlers(
	describeRoute({
		description: "Revokes an OAuth refresh token and its connection.",
		tags: ["oauth"],
		summary: "Revoke OAuth Token",
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

		const result = await serviceWrapper(oauthServices.revokeToken, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, {
			token: parsed.data.token,
			clientId: parsed.data.client_id,
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
