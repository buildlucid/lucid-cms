import type { Toolkit } from "@lucidcms/core/toolkit";
import type { LucidAstroContext } from "./types.js";

/**
 * Returns the toolkit associated with the current Astro runtime.
 *
 * This placeholder is replaced with a generated project module by the integration.
 */
const getToolkit = async (_context: LucidAstroContext): Promise<Toolkit> => {
	throw new Error(
		"@lucidcms/astro/toolkit is only available in an Astro project using the Lucid integration.",
	);
};

export default getToolkit;
