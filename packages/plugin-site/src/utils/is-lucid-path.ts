import { pluginPublicDirectory, reservedPaths } from "@lucidcms/core/extension";
import { ASSETS_BASE } from "../constants.js";

const prefixes = [
	...Object.values(reservedPaths),
	`/${pluginPublicDirectory}`,
	ASSETS_BASE.slice(0, -1),
];

/** The admin app, Lucid's server endpoints, plugin files and built assets, which the site never renders. */
const isLucidPath = (path: string) =>
	prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export default isLucidPath;
