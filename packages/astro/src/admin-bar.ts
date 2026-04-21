import type { AstroGlobal } from "astro";
import astroConstants from "./constants.js";
import type { LucidAstroAdminBarContext } from "./types.js";

/**
 * Attach admin bar metadata to the current Astro request.
 *
 * Use this in a page or layout after you've loaded the Lucid document that
 * powers the route. When the current page is editable, Lucid can use this
 * metadata to show an `Edit document` action for that document.
 *
 * @example
 * ```astro
 * ---
 * import { setAdminBar } from "@lucidcms/astro";
 *
 * setAdminBar(Astro, {
 *   edit: {
 *     collectionKey: "page",
 *     documentId: page.id,
 *     label: "Edit homepage",
 *   },
 * });
 * ---
 * ```
 */
const setAdminBar = (
	astro: Pick<AstroGlobal, "locals">,
	context: LucidAstroAdminBarContext,
) => {
	const locals = astro.locals as Record<string, unknown>;
	locals[astroConstants.integration.adminBarLocalsKey] = context;
};

export default setAdminBar;
