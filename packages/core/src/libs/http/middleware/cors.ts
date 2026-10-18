import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import type { LucidHonoContext } from "../../../types/hono.js";

/** Browser origins permitted by both CORS and the MCP endpoint. */
export const getAllowedCorsOrigins = (config: ResolvedLucidConfig) => [
	...(config.urls.cms ? [new URL(config.urls.cms).origin] : []),
	...(config.http.security.cors?.origin ?? []),
];

/** Applies the shared CORS policy, including MCP transport parameter headers. */
const createCorsMiddleware = (config: ResolvedLucidConfig) => {
	const allowedOrigins = getAllowedCorsOrigins(config);
	const allowedHeaders = [
		"Content-Type",
		"Authorization",
		"X-API-Key",
		"Mcp-Protocol-Version",
		"Mcp-Method",
		"Mcp-Name",
		"Mcp-Session-Id",
		"Last-Event-ID",
		"Content-Length",
		...Object.values(constants.headers),
		...(config.http.security.cors?.allowHeaders ?? []),
	];

	const policy = (headers: string[]) =>
		cors({
			origin: (origin, c) => {
				if (c.req.path === "/api/oauth/authorize") return null;
				return allowedOrigins.includes(origin) ? origin : null;
			},
			allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
			allowHeaders: headers,
			exposeHeaders: [
				constants.headers.requestId,
				"WWW-Authenticate",
				"Mcp-Protocol-Version",
				"Mcp-Session-Id",
			],
			credentials: true,
		});
	const standard = policy(allowedHeaders);

	return createMiddleware((c: LucidHonoContext, next) => {
		if (
			c.req.method === "OPTIONS" &&
			(c.req.path === "/mcp" || c.req.path.startsWith("/mcp/"))
		) {
			const parameterHeaders =
				c.req
					.header("Access-Control-Request-Headers")
					?.split(",")
					.map((header) => header.trim())
					.filter((header) => /^mcp-param-[a-z0-9._-]+$/i.test(header)) ?? [];
			if (parameterHeaders.length > 0)
				return policy([...allowedHeaders, ...parameterHeaders])(c, next);
		}
		return standard(c, next);
	});
};

export default createCorsMiddleware;
