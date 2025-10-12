import type { KVAdapterInstance } from "./types.js";
import cacheKeys from "./cache-keys.js";

/**
 * Adds a key to multiple cache groups.
 */
export const addKeyToGroups = async (
	kv: KVAdapterInstance,
	groups: string[],
	key: string,
) => {
	await Promise.all(
		groups.map(async (group) => {
			const groupKey = cacheKeys.http.group(group);
			const existingKeys = (await kv.get<string[]>(groupKey)) || [];

			if (!existingKeys.includes(key)) {
				existingKeys.push(key);
				await kv.set(groupKey, existingKeys);
			}
		}),
	);
};

/**
 * Invalidates a cache group by deleting all keys associated with it.
 */
export const invalidateHttpCacheGroup = async (
	kv: KVAdapterInstance,
	group: string,
) => {
	const groupKey = cacheKeys.http.group(group);
	const keys = (await kv.get<string[]>(groupKey)) || [];

	await Promise.all(keys.map((key) => kv.delete(key)));
	await kv.delete(groupKey);
};

/**
 * Invalidates multiple cache groups by deleting all keys associated with them.
 */
export const invalidateHttpCacheGroups = async (
	kv: KVAdapterInstance,
	groups: string[],
) => {
	await Promise.all(groups.map((group) => invalidateHttpCacheGroup(kv, group)));
};
