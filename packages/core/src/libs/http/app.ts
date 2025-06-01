import { Hono } from "hono";
import routes from "./routes/v1/index.js";
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
		.route("/", routes);

	return app;
};

export default createApp;
