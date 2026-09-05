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
 * type SearchToolkit = ReturnType<typeof createSearchToolkit>;
 *
 * const searchToolkit = defineToolkit({
 *   key: "search",
 *   create: ({ context, core }) => createSearchToolkit(context, core.documents),
 * });
 *
 * declare module "@lucidcms/core/types" {
 *   interface ToolkitServices {
 *     search: SearchToolkit;
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
