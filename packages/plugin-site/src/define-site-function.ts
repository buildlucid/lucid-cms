import { LucidError } from "@lucidcms/core";
import { type RenderAware, type RenderInfo, withRender } from "@lucidkiln/core";
import { PLUGIN_KEY } from "./constants.js";
import {
	type SiteFunctionSource,
	siteFunctionSource,
} from "./engine/site-function-sources.js";
import type { SiteFunctionContext, SiteState } from "./types.js";

type Tail<Items extends readonly unknown[]> = Items extends readonly [
	unknown,
	...infer Rest,
]
	? Rest
	: never;

/** Defines a function, filter or test for `kiln` options with site context before template arguments; use Kiln's `withRender` for generic functions to preserve their type parameters. */
function defineSiteFunction<
	Call extends (context: SiteFunctionContext, ...args: never) => unknown,
>(
	call: Call,
): RenderAware<
	(
		render: RenderInfo<SiteState>,
		...args: Tail<Parameters<Call>>
	) => ReturnType<Call>
>;
// The overload keeps each function's own argument and return types; this signature only stores the code.
function defineSiteFunction(call: SiteFunctionSource) {
	return {
		...withRender(() => {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message:
					"Site functions only run when registered in the site plugin's kiln options.",
			});
		}),
		[siteFunctionSource]: call,
	};
}

export default defineSiteFunction;
