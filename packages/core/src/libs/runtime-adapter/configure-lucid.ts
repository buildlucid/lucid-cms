import { produce } from "immer";
import type { LucidConfigDefinition } from "./types.js";

/**
 * Wraps your Lucid CMS config and gives it the right shape for `lucid.config.*`.
 * Use it to declare the runtime adapter and return the rest of your
 * config from the `config(env)` callback.
 *
 * @example
 * ```ts
 * export default configureLucid({
 *   adapter: {
 *     from: "@lucidcms/node-adapter",
 *   },
 *   config: (env) => ({
 *     collections: [],
 *     plugins: [],
 *   }),
 * });
 * ```
 */
const configureLucid = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
): LucidConfigDefinition<AdapterFrom> => {
	return produce(definition, () => {});
};

export default configureLucid;
