import type { Toolkit } from "@lucidcms/core/toolkit";

/**
 * Returns the server-side Lucid toolkit generated for the current Astro project.
 *
 * The Astro integration aliases this placeholder to a generated runtime module
 * inside projects that use `lucidCMS()`.
 */
const getToolkit = async (): Promise<Toolkit> => {
	throw new Error(
		"`@lucidcms/astro/toolkit` is only available inside an Astro project using the Lucid integration.",
	);
};

export default getToolkit;
