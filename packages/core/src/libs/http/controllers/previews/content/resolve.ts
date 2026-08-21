import { minutesToMilliseconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/previews.js";
import { previewSessionServices } from "../../../../../services/index.js";
import type { PreviewResolution } from "../../../../../types.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import externalAuthentication from "../../../middleware/external-authenticate.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const resolvePreviewController = factory.createHandlers(
	describeRoute({
		description: "Validate a preview token for use by a browser application.",
		tags: ["content-previews"],
		summary: "Resolve Preview",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.resolve.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.resolve.body),
		parameters: openAPI.parameters({ headers: { authorization: false } }),
	}),
	externalAuthentication({ optional: true }),
	rateLimiter({
		mode: "ip",
		scope: "preview-resolve",
		limit: constants.rateLimit.scopes.standard.limit,
		windowMs: minutesToMilliseconds(1),
		skip: (c) => Boolean(c.get("externalAuth")),
	}),
	validate("json", controllerSchemas.resolve.body),
	async (c) => {
		const { token } = c.req.valid("json");
		const context = createServiceContext(c);

		const preview = await serviceWrapper(previewSessionServices.resolve, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.preview.resolve.error.name"),
				message: copy("server:core.routes.preview.resolve.error.message"),
			},
		})(context, { token });
		if (preview.error) throw new LucidAPIError(preview.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.header("Referrer-Policy", "no-referrer");

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: {
					mode: preview.data.mode,
					expiresAt: preview.data.expiresAt,
				} satisfies PreviewResolution,
			}),
		);
	},
);

export default resolvePreviewController;
