import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const basePath = `/${constants.directories.base}`;
const adminPath = `/${constants.directories.admin}`;
const cdnPath = `${basePath}/cdn`;

const isWithin = (path: string, prefix: string) =>
	path === prefix || path.startsWith(`${prefix}/`);

/** Asks search engines not to index Lucid's admin, API and docs, excluding public CDN media. */
const noIndex = createMiddleware(async (c: LucidHonoContext, next) => {
	await next();

	const path = c.req.path;
	const isLucidPath = isWithin(path, basePath) || isWithin(path, adminPath);
	if (!isLucidPath || isWithin(path, cdnPath)) return;
	c.header("X-Robots-Tag", "noindex, nofollow");
});

export default noIndex;
