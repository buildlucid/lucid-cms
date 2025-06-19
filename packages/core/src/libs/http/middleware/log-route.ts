import { createMiddleware } from "hono/factory";
import logger from "../../../utils/logging/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const logRoute = createMiddleware(async (c: LucidHonoContext, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	const userAgent = c.req.header("user-agent");

	logger("info", {
		message: `→ ${method} ${path}`,
		scope: "http",
		data: {
			method,
			path,
			userAgent,
			timestamp: start,
			type: "request",
		},
	});

	await next();

	const duration = Date.now() - start;
	const status = c.res.status;

	logger("info", {
		message: `← ${method} ${path} ${status} - ${duration}ms`,
		scope: "http",
		data: {
			method,
			path,
			status,
			duration,
			userAgent,
			type: "response",
		},
	});
});

export default logRoute;
