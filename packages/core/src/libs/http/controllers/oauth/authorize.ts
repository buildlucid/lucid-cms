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

const authorizeController = factory.createHandlers(
	describeRoute({
		description:
			"Starts an OAuth Authorization Code flow for a registered client or client metadata document using S256 PKCE.",
		tags: ["oauth"],
		summary: "Authorize OAuth Client",
		parameters: openAPI.parameters({
			query: oauthSchemas.authorize.query,
		}),
		responses: {
			303: {
				description:
					"Redirects to Lucid consent or to the registered client redirect URI.",
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
		limit: constants.rateLimit.scopes.low.limit,
		scope: "oauth-authorize",
		windowMs: minutesToMilliseconds(1),
	}),
	async (c: LucidHonoContext) => {
		const context = createServiceContext(c);
		const parameters = uniqueOAuthParameters(new URL(c.req.url).searchParams);
		const parsed = oauthSchemas.authorize.query.safeParse(parameters);
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

		const result = await serviceWrapper(oauthServices.startAuthorization, {
			transaction: true,
			defaultError: { type: "basic" },
		})(context, {
			clientId: parsed.data.client_id,
			redirectUri: parsed.data.redirect_uri,
			responseType: parsed.data.response_type,
			resource: parsed.data.resource,
			scope: parsed.data.scope,
			state: parsed.data.state,
			codeChallenge: parsed.data.code_challenge,
			codeChallengeMethod: parsed.data.code_challenge_method,
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
		c.header("Referrer-Policy", "no-referrer");
		return c.redirect(result.data.redirectUrl, 303);
	},
);

export default authorizeController;
