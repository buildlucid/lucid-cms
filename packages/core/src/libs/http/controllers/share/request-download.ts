import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/share.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const requestDownloadController = factory.createHandlers(
	describeRoute({
		description:
			"Placeholder endpoint for requesting a share-link download URL.",
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
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: { url: null },
			}),
		);
	},
);

export default requestDownloadController;
