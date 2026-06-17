import { produce } from "immer";
import type { LucidConfigDefinition } from "./types.js";

/**
 * Wraps your Lucid CMS config and gives it the right shape for `lucid.config.*`.
 * Use it to pass the runtime/database adapters and return the rest of your
 * config from the `config(env)` callback.
 *
 * @example
 * ```ts
 * import { node } from "@lucidcms/node-adapter";
 * import { sqlite } from "@lucidcms/sqlite-adapter";
 *
 * export default configureLucid({
 *   runtime: node,
 *   db: sqlite,
 *   config: (env) => ({
 *     collections: [],
 *     plugins: [],
 *   }),
 * });
 * ```
 */
const configureLucid = (
	definition: LucidConfigDefinition,
): LucidConfigDefinition => {
	return produce(definition, () => {});
};

export default configureLucid;
