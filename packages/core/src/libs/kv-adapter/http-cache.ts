import cacheKeys from "./cache-keys.js";
import type { KVAdapterInstance } from "./types.js";

/**
 * Adds a key to multiple cache tags.
 */
export const addKeyToTag = async (
	kv: KVAdapterInstance,
	tags: string[],
	key: string,
) => {
	await Promise.all(
		tags.map(async (tag) => {
			const tagKey = cacheKeys.http.tag(tag);
			const existingKeys =
				(await kv.get<string[]>(tagKey, { hash: true })) || [];

			if (!existingKeys.includes(key)) {
				existingKeys.push(key);
				await kv.set(tagKey, existingKeys, { hash: true });
			}
		}),
	);
};

/**
 * Invalidates a cache tag by deleting all keys associated with it.
 */
export const invalidateHttpCacheTag = async (
	kv: KVAdapterInstance,
	tag: string,
) => {
	const tagKey = cacheKeys.http.tag(tag);
	const keys = (await kv.get<string[]>(tagKey, { hash: true })) || [];

	await Promise.all(keys.map((key) => kv.delete(key, { hash: true })));
	await kv.delete(tagKey, { hash: true });
};

/**
 * Invalidates multiple cache tags by deleting all keys associated with them.
 */
export const invalidateHttpCacheTags = async (
	kv: KVAdapterInstance,
	tags: string[],
) => {
	await Promise.all(tags.map((tag) => invalidateHttpCacheTag(kv, tag)));
};
