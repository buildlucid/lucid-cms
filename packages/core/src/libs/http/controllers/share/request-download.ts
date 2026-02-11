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

const requestDownloadController = factory.createHandlers(
	describeRoute({
		description:
			"Request a direct download URL for a shared media item after validating share access.",
		tags: ["share"],
		summary: "Request Share Download URL",
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.requestDownload.params,
		}),
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.requestDownload.response),
		}),
	}),
	rateLimiter({
		mode: "ip",
		scope: constants.rateLimit.scopes.low.scopeKey,
		limit: constants.rateLimit.scopes.low.limit,
		windowMs: minutesToMilliseconds(1),
	}),
	validate("param", controllerSchemas.requestDownload.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = getServiceContext(c);
		const sessionCookie = getCookie(c, createAuthCookieName(token));

		const authorizeRes = await serviceWrapper(
			mediaShareLinkServices.authorizeShare,
			{ transaction: false },
		)(context, {
			token,
			sessionCookie,
			enforcePasswordSession: true,
		});
		if (authorizeRes.error) throw new LucidAPIError(authorizeRes.error);

		const downloadRes = await serviceWrapper(
			mediaShareLinkServices.requestDownload,
			{ transaction: false },
		)(context, {
			mediaKey: authorizeRes.data.mediaKey,
		});
		if (downloadRes.error) throw new LucidAPIError(downloadRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: {
					url: downloadRes.data.url,
				},
			}),
		);
	},
);

export default requestDownloadController;
