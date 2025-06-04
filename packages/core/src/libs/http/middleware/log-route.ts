import { createMiddleware } from "hono/factory";
import logger from "../../../utils/logging/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const logRoute = (hook: "prehandler" | "onResponse") =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		if (hook === "prehandler") {
			logger("info", {
				message: `Request - ${c.req.url}`,
				scope: c.req.method,
				data: {
					userAgent: c.req.header("user-agent"),
					timeStamp: Date.now(),
				},
			});
			return;
		}

		logger("info", {
			message: `Response - ${c.req.url}`,
			scope: c.req.method,
			data: {
				userAgent: c.req.header("user-agent"),
				timeStamp: Date.now(),
				// elapsedTime: c.res.elapsedTime,
				status: c.res.status,
			},
		});

		return await next();
	});

export default logRoute;
