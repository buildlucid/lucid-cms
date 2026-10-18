import type { SiteFunctionContext } from "../types.js";

/** A site function's own code, which receives the site context before its template arguments. */
export type SiteFunctionSource = (
	context: SiteFunctionContext,
	...args: unknown[]
) => unknown;

/** Registered symbol sharing callable sources across package copies so each Kiln instance can bind its own reads. */
export const siteFunctionSource = Symbol.for("@lucidcms/plugin-site:function");

export const getSiteFunctionSource = (
	callable: object,
): SiteFunctionSource | undefined => {
	const source: unknown = Reflect.get(callable, siteFunctionSource);
	return typeof source === "function"
		? (source as SiteFunctionSource)
		: undefined;
};
