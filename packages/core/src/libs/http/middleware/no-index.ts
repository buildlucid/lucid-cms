import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const basePath = `/${constants.directories.base}`;
const cdnPath = `${basePath}/cdn`;

const isWithin = (path: string, prefix: string) =>
	path === prefix || path.startsWith(`${prefix}/`);

/** Asks search engines not to index Lucid's admin, API and docs, excluding public CDN media. */
const noIndex = createMiddleware(async (c: LucidHonoContext, next) => {
	await next();

	if (!isWithin(c.req.path, basePath) || isWithin(c.req.path, cdnPath)) return;
	c.header("X-Robots-Tag", "noindex, nofollow");
});

export default noIndex;
