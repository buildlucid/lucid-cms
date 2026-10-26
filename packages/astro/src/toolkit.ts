import lucid from "lucid:hosted";
import type { Toolkit } from "@lucidcms/core/types";
import { getRequestInvocation } from "./internal/request-invocation.js";
import type { LucidAstroContext } from "./types.js";

/** Returns the Lucid toolkit for the current Astro request, in an Astro project using the Lucid integration. */
const getToolkit = async (context: LucidAstroContext): Promise<Toolkit> => {
	const invocation = await getRequestInvocation(context.locals, () =>
		lucid.createInvocation(),
	);
	return invocation.getToolkit(context.request);
};

export default getToolkit;
