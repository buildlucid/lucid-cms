import { minutesToMilliseconds } from "date-fns";
import { getCookie } from "hono/cookie";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import constants from "../../../../constants/constants.js";
import { authServices } from "../../../../services/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getStatusController = factory.createHandlers(
	describeRoute({
		description:
			"Checks whether the current browser cookies represent an active session without refreshing or rotating tokens.",
		tags: ["auth"],
		summary: "Get Auth Status",
		responses: openAPI.responses(),
	}),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: "auth-status",
		windowMs: minutesToMilliseconds(1),
	}),
	async (c: LucidHonoContext) => {
		const statusRes = await authServices.getStatus(createServiceContext(c), {
			accessToken: getCookie(c, constants.cookies.accessToken),
			refreshToken: getCookie(c, constants.cookies.refreshToken),
		});
		if (statusRes.error) throw new LucidAPIError(statusRes.error);

		c.header("Cache-Control", "no-store");

		c.status(204);
		return c.body(null);
	},
);

export default getStatusController;
