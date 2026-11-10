import { queryKeys } from "./query-keys";

/**
 * Keys for the data `queries` reads. Use them to refresh that data, or to nest your own queries
 * beneath it so they refresh with it.
 *
 * @example
 * ```ts
 * import { queryKeys } from "@lucidcms/admin/services";
 *
 * client.invalidateQueries({ queryKey: queryKeys.media.all() });
 * ```
 */
export const publicQueryKeys = {
	account: queryKeys.account,
	collections: queryKeys.collections,
	documents: queryKeys.documents,
	media: queryKeys.media,
};
