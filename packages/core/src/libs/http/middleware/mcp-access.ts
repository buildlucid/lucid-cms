import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { getAllowedCorsOrigins } from "./cors.js";

/** Keeps disabled MCP private and rejects untrusted browser origins. */
const mcpAccess = createMiddleware(async (c: LucidHonoContext, next) => {
	const config = c.get("config");
	if (!config.mcp.enabled) return c.notFound();

	const origin = c.req.header("Origin");
	if (origin && !getAllowedCorsOrigins(config).includes(origin)) {
		return c.text("Forbidden origin", 403);
	}

	return next();
});

export default mcpAccess;
