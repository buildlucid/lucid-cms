import { createMiddleware } from "hono/factory";
import logger from "../../logger/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const humanize = (times: string[]) => {
	const [delimiter, separator] = [",", "."];
	const orderTimes = times.map((v) =>
		v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${delimiter}`),
	);
	return orderTimes.join(separator);
};

const time = (start: number) => {
	const delta = Date.now() - start;
	return humanize([
		delta < 1000 ? `${delta}ms` : `${Math.round(delta / 1000)}s`,
	]);
};

const logRoute = createMiddleware(async (c: LucidHonoContext, next) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;
	const userAgent = c.req.header("user-agent");

	logger.info({
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

	const status = c.res.status;

	logger.info({
		message: `← ${method} ${path} ${status} - ${time(start)}`,
		scope: "http",
		data: {
			method,
			path,
			status,
			userAgent,
			type: "response",
		},
	});
});

export default logRoute;
