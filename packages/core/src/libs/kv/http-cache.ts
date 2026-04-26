import {
	getNamespaceTokens,
	invalidateNamespace,
	invalidateNamespaces,
} from "./namespaces.js";
import type { KVAdapterInstance } from "./types.js";

const HTTP_NAMESPACE_PREFIX = "http-cache:";

const toHttpNamespace = (tag: string) => `${HTTP_NAMESPACE_PREFIX}${tag}`;

/**
 * Resolve the namespace token for each HTTP cache tag.
 */
export const getHttpCacheNamespaceTokens = async (
	kv: KVAdapterInstance,
	tags: string[],
): Promise<Record<string, string>> => {
	const namespaces = Array.from(new Set(tags)).map(toHttpNamespace);
	const namespaceTokens = await getNamespaceTokens(kv, namespaces);

	const tagTokenPairs = tags.map((tag) => [
		tag,
		namespaceTokens[toHttpNamespace(tag)],
	]);

	return Object.fromEntries(tagTokenPairs);
};

/**
 * Invalidates a cache tag by rotating its namespace token.
 */
export const invalidateHttpCacheTag = async (
	kv: KVAdapterInstance,
	tag: string,
) => {
	await invalidateNamespace(kv, toHttpNamespace(tag));
};

/**
 * Invalidates multiple cache tags by rotating namespace tokens.
 */
export const invalidateHttpCacheTags = async (
	kv: KVAdapterInstance,
	tags: string[],
) => {
	await invalidateNamespaces(kv, tags.map(toHttpNamespace));
};
