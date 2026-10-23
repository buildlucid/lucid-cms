import type { HostAdapter } from "@lucidcms/core/types";

/**
 * Declares that Astro serves Lucid in the project, so Lucid's CLI leaves the server and builds to Astro.
 *
 * @example
 * ```ts
 * import { astroHost } from "@lucidcms/astro/host";
 *
 * export default defineConfig({
 *   runtime: node,
 *   host: astroHost,
 *   db: sqlite,
 *   config: () => ({}),
 * });
 * ```
 */
export const astroHost: HostAdapter = {
	key: "astro",
	cli: "@lucidcms/astro/cli",
};
