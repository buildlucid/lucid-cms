import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ResolvedRedirect } from "../../redirects/types.js";
import resolve, { type ToolkitRedirectsResolveInput } from "./resolve/index.js";

export type ToolkitRedirects = {
	/**
	 * Finds where a path redirects to from the configured `redirects` sources, such as the pages
	 * plugin. Call it when no page matches. Returns null when nothing redirects the path.
	 *
	 * @example
	 * ```ts
	 * const redirect = await toolkit.redirects.resolve({
	 *   path: "/old-page",
	 *   environment: "production",
	 * });
	 * if (redirect.data) return hono.redirect(redirect.data.location, redirect.data.status);
	 * ```
	 */
	resolve: (
		input: ToolkitRedirectsResolveInput,
	) => ServiceResponse<ResolvedRedirect | null>;
};

/** Creates redirect helpers for a toolkit instance. */
export const createRedirectsToolkit = (
	context: ServiceContext,
): ToolkitRedirects => ({
	resolve: (input) => resolve(context, input),
});

export default createRedirectsToolkit;
