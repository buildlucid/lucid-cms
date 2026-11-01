import { createMiddleware } from "hono/factory";
import { routePath } from "hono/route";
import type { LucidHonoContext } from "../../../types/hono.js";
import logger from "../../logger/index.js";

/**
 * Logs method, route pattern and elapsed time after handling. Route patterns keep path tokens out
 * of logs.
 */
const logRoute = createMiddleware(async (c: LucidHonoContext, next) => {
	const start = Date.now();
	const method = c.req.method;
	const userAgent = c.req.header("user-agent");

	await next();

	const route = routePath(c);
	const path = route.includes(":") ? route : c.req.path;

	const status = c.res.status;
	const durationMs = Date.now() - start;

	logger.info({
		event: "http.request.completed",
		message: `${method} ${path} ${status} ${durationMs}ms`,
		scope: "http",
		data: {
			durationMs,
			method,
			path,
			status,
			userAgent,
		},
	});
});

export default logRoute;
