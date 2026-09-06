import type {
	ToolkitDefinition,
	ToolkitDefinitionInput,
	ToolkitServices,
} from "./types.js";

type ToolkitServiceKey = Extract<keyof ToolkitServices, string>;

/**
 * Defines one plugin-owned service namespace for Lucid's server toolkit.
 * Export the service type and merge it into `ToolkitServices` from the plugin's
 * public entry point so consumers receive the same type everywhere.
 * The factory must return its service synchronously. Service methods can be async.
 *
 * @example
 * ```ts
 * const createArticlesToolkit = (core: CoreToolkit) => ({
 *   recent: () => core.documents.getMultiple({
 *     collectionKey: "articles",
 *     version: "published",
 *     query: { perPage: 5 },
 *   }),
 * });
 * type ArticlesToolkit = ReturnType<typeof createArticlesToolkit>;
 *
 * const articlesToolkit = defineToolkit({
 *   key: "articles",
 *   create: ({ core }) => createArticlesToolkit(core),
 * });
 *
 * declare module "@lucidcms/core/types" {
 *   interface ToolkitServices {
 *     articles: ArticlesToolkit;
 *   }
 * }
 * ```
 */
function defineToolkit<const TKey extends ToolkitServiceKey>(
	definition: ToolkitDefinitionInput<TKey, ToolkitServices[TKey] & object>,
): ToolkitDefinition<TKey, ToolkitServices[TKey] & object>;
function defineToolkit<const TKey extends string, TService extends object>(
	definition: ToolkitDefinitionInput<TKey, TService>,
	...validation: TKey extends ToolkitServiceKey
		? [serviceTypeMismatch: never]
		: []
): ToolkitDefinition<TKey, TService>;
function defineToolkit(
	definition: ToolkitDefinitionInput,
	..._validation: unknown[]
): ToolkitDefinition {
	return {
		...definition,
		type: "toolkit-definition",
	};
}

export default defineToolkit;
