import { getToolkit as getRuntimeToolkit } from "virtual:lucid/astro-runtime";
import type { Toolkit } from "@lucidcms/core/types";
import type { LucidAstroContext } from "./types.js";

/** Returns the Lucid toolkit for the current Astro request, in an Astro project using the Lucid integration. */
const getToolkit = (context: LucidAstroContext): Promise<Toolkit> =>
	getRuntimeToolkit(context);

export default getToolkit;
