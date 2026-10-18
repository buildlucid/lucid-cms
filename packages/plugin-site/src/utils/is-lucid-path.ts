import { ASSETS_BASE } from "../constants.js";

/** The admin app, Lucid's server endpoints, plugin files and built assets, which the site never renders. */
const isLucidPath = (path: string) =>
	[
		"/admin",
		"/api",
		"/mcp",
		"/cdn",
		"/_plugins",
		ASSETS_BASE.slice(0, -1),
	].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export default isLucidPath;
