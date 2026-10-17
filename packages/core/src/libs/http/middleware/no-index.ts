import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const { admin, api, mcp } = constants.paths;
const noIndexPaths = [admin, api, mcp];

const isWithin = (path: string, prefix: string) =>
	path === prefix || path.startsWith(`${prefix}/`);

/** Asks search engines not to index Lucid's admin, API, docs and MCP server while keeping media indexable. */
const noIndex = createMiddleware(async (c: LucidHonoContext, next) => {
	await next();

	if (!noIndexPaths.some((prefix) => isWithin(c.req.path, prefix))) return;
	c.header("X-Robots-Tag", "noindex, nofollow");
});

export default noIndex;
