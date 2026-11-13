import type {
	HttpExtensionRegister,
	ResolvedLucidConfig,
} from "@lucidcms/core/types";

/**
 * Adds an extension serving files at the site's root, such as `/robots.txt`, where a project's own
 * copies win on every runtime: the site plugin's file pages answer in `afterRoutes`, and public
 * files before Lucid or, on built Node servers, in `afterSetup`, after plugins' extensions there.
 * So these wait for `fallback`, first in it, to still answer before the site plugin's pages
 * whichever order plugins are listed in.
 */
const addRootFiles = (
	draft: ResolvedLucidConfig,
	name: string,
	register: HttpExtensionRegister,
) => {
	draft.http.extensions.unshift({ name, phase: "fallback", register });
};

export default addRootFiles;
