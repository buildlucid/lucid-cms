import { Hono } from "hono";
import routes from "./routes/v1/index.js";
import { decodeError } from "../../utils/errors/index.js";
import type { Config } from "../../types.js";
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
			const { name, message, status, errorResponse, code } = decodeError(err);

			// Todo: add logging

			return c.json({
				status,
				code,
				name,
				message,
				errors: errorResponse,
			});
		});

	return app;
};

export default createApp;
