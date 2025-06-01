import T from "../../translations/index.js";
import { Hono } from "hono";
import constants from "../../constants/constants.js";
import routes from "./routes/v1/index.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { Config, LucidErrorData } from "../../types.js";
import type { LucidHonoContext } from "../../types/hono.js";

/**
 * The entry point for creating the Hono app.
 */
const createApp = async (props: {
	config: Config;
}) => {
	const app = new Hono<LucidHonoContext>()
		.use(async (c, next) => {
			c.set("config", props.config);
			await next();
		})
		.route("/", routes)
		.onError(async (err, c) => {
			if (err instanceof LucidAPIError) {
				return c.json({
					name: err.error.name,
					message: err.error.message,
					status: err.error.status,
					errorResponse: err.error.errorResponse,
					code: err.error.code,
				} satisfies Exclude<LucidErrorData, "zod">);
			}

			// @ts-expect-error
			if (err?.statusCode === 429) {
				return c.json({
					code: "rate_limit",
					name: T("rate_limit_error_name"),
					message: err.message || constants.errors.message,
					status: 429,
				});
			}

			return c.json({
				name: constants.errors.name,
				message: err.message || constants.errors.message,
				status: constants.errors.status,
				errorResponse: constants.errors.errorResponse,
				code: constants.errors.code,
			});
		});

	return app;
};

export default createApp;
