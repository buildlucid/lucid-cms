import { pluginPublicDirectory, reservedPaths } from "@lucidcms/core/extension";

const prefixes = [...Object.values(reservedPaths), `/${pluginPublicDirectory}`];

/** The admin app, Lucid's server endpoints, plugin files and built assets, which the site never renders. */
const isLucidPath = (path: string) =>
	prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

export default isLucidPath;
