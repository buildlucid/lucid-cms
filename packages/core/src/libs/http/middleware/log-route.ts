import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import logger from "../../logger/index.js";

const logRoute = createMiddleware(async (c: LucidHonoContext, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	const userAgent = c.req.header("user-agent");

	await next();

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
