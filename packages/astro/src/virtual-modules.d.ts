/** The project's Lucid runtime for Astro, which Lucid's Astro integration serves. */
declare module "virtual:lucid/astro-runtime" {
	import type { LucidInvocation, Toolkit } from "@lucidcms/core/types";

	/** Serves an Astro request with Lucid. */
	export const handle: (context: {
		request: Request;
		locals?: object;
	}) => Promise<Response>;
	/** The toolkit for the current Astro request. */
	export const getToolkit: (context: {
		request: Request;
		url: URL;
		locals: object;
	}) => Promise<Toolkit>;
	/** Creates an invocation the caller owns, such as for Worker events outside a request. */
	export const createLucidInvocation: (
		context?: unknown,
	) => Promise<{ invocation: LucidInvocation }>;
}
