import { minutesToMilliseconds } from "date-fns";
import { getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/share.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import createAuthCookieName from "../../../../utils/share-link/auth-cookie.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const getShareAccessController = factory.createHandlers(
	describeRoute({
		description:
			"Returns share link metadata and whether the current visitor must provide a password.",
		tags: ["share"],
		summary: "Get Share Access",
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getShareAccess.params,
		}),
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getShareAccess.response),
		}),
	}),
	rateLimiter({
		mode: "ip",
		scope: constants.rateLimit.scopes.low.scopeKey,
		limit: constants.rateLimit.scopes.low.limit,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", controllerSchemas.getShareAccess.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = getServiceContext(c);
		const sessionCookie = getCookie(c, createAuthCookieName(token));

		const accessRes = await serviceWrapper(
			mediaShareLinkServices.getShareAccess,
			{
				transaction: false,
			},
		)(context, {
			token,
			sessionCookie,
		});
		if (accessRes.error) throw new LucidAPIError(accessRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: accessRes.data,
			}),
		);
	},
);

export default getShareAccessController;
