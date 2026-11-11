import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import QueryCountPlugin from "../../db/client/query/count-plugin.js";

/**
 * With `http.serverTiming`, counts the database queries each request runs and reports them in a
 * `Server-Timing` header, eg. `db;desc="12 queries";dur=4.2`. Register it after the request's
 * database is set.
 */
const serverTiming = createMiddleware(async (c: LucidHonoContext, next) => {
	if (!c.get("config").http.serverTiming) {
		return next();
	}

	const queries = new QueryCountPlugin();
	c.set("db", c.get("db").withPlugin(queries));
	await next();

	c.header(
		"Server-Timing",
		`db;desc="${queries.count} queries";dur=${queries.durationMs.toFixed(1)}`,
		{ append: true },
	);
});

export default serverTiming;
