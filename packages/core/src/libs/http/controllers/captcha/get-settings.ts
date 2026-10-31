import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/captcha.js";
import { captchaServices } from "../../../../services/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSettingsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the public captcha settings and which built-in forms need a token, or null when no captcha adapter is configured.",
		tags: ["captcha"],
		summary: "Get Captcha Settings",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getSettings.response),
		}),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: constants.rateLimit.scopes.standard.scopeKey,
		windowMs: 60_000,
	}),
	async (c: LucidHonoContext) => {
		const context = createServiceContext(c);
		const settingsRes = await serviceWrapper(captchaServices.getSettings, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.captcha.settings.error.name"),
				message: copy("server:core.routes.captcha.settings.error.message"),
			},
		})(context);
		if (settingsRes.error) throw new LucidAPIError(settingsRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: settingsRes.data,
			}),
		);
	},
);

export default getSettingsController;
