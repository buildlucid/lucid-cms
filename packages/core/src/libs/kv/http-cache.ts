import type { ServiceContext } from "../../utils/services/types.js";
import {
	getNamespaceTokens,
	invalidateNamespace,
	invalidateNamespaces,
} from "./namespaces.js";

const HTTP_NAMESPACE_PREFIX = "http-cache:";

const toHttpNamespace = (tag: string) => `${HTTP_NAMESPACE_PREFIX}${tag}`;

/**
 * Resolve the namespace token for each HTTP cache tag.
 */
export const getHttpCacheNamespaceTokens = async (
	context: ServiceContext,
	tags: string[],
): Promise<Record<string, string>> => {
	const namespaces = Array.from(new Set(tags)).map(toHttpNamespace);
	const namespaceTokens = await getNamespaceTokens(context, namespaces);

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
	context: ServiceContext,
	tag: string,
) => {
	await invalidateNamespace(context, toHttpNamespace(tag));
};

/**
 * Invalidates multiple cache tags by rotating namespace tokens.
 */
export const invalidateHttpCacheTags = async (
	context: ServiceContext,
	tags: string[],
) => {
	await invalidateNamespaces(context, tags.map(toHttpNamespace));
};
