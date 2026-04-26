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
 *     module: "@lucidcms/node-adapter",
 *   },
 *   database: {
 *     module: "@lucidcms/sqlite-adapter",
 *     options: {
 *       database: "./db.sqlite",
 *     },
 *   },
 *   config: (env) => ({
 *     collections: [],
 *     plugins: [],
 *   }),
 * });
 * ```
 */
const configureLucid = <
	AdapterModule extends string,
	DatabaseModule extends string,
>(
	definition: LucidConfigDefinition<AdapterModule, DatabaseModule>,
): LucidConfigDefinition<AdapterModule, DatabaseModule> => {
	return produce(definition, () => {});
};

export default configureLucid;
