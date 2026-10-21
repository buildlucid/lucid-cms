import { contentCacheTags, getCacheTagTokens } from "@lucidcms/core/extension";
import type { ServiceContext } from "@lucidcms/core/types";
import type { KilnCache } from "@lucidkiln/core";
import { storeKeys } from "../constants.js";
import storeLifetime from "./store-lifetime.js";

type Fragment = { value: string; tokens: Record<string, string> };

/**
 * Kiln's fragment store, shared by every request the site serves. Kiln's cache contract passes no request, so tokens are
 * read afresh per get and set rather than memoised per request as stored pages' are.
 */
const createFragmentCache = (context: ServiceContext): KilnCache => {
	// Tokens at cache misses prevent saving fragments rendered across a content change.
	const guards = [contentCacheTags.documents, contentCacheTags.media];
	const missed = new Map<string, string>();
	const guardToken = (tokens: Record<string, string>) =>
		guards.map((tag) => tokens[tag] ?? "").join("|");

	return {
		get: async ({ key }) => {
			const fragment = await context.kv.get<Fragment>(context, {
				key: storeKeys.fragment(key),
				hash: true,
			});
			const tags = Object.keys(fragment?.tokens ?? {});
			const tokens = await getCacheTagTokens(context, [...guards, ...tags]);
			if (
				fragment &&
				tags.every((tag) => tokens[tag] === fragment.tokens[tag])
			) {
				return fragment.value;
			}

			missed.set(key, guardToken(tokens));
			return null;
		},
		set: async ({ key, value, seconds, tags }) => {
			const seen = missed.get(key);
			missed.delete(key);

			const tokens = await getCacheTagTokens(context, [...guards, ...tags]);
			if (seen === undefined || guardToken(tokens) !== seen) return;

			await context.kv.set<Fragment>(context, {
				key: storeKeys.fragment(key),
				value: {
					value,
					tokens: Object.fromEntries(
						tags.map((tag) => [tag, tokens[tag] ?? ""]),
					),
				},
				hash: true,
				ttlSeconds: storeLifetime(seconds),
			});
		},
	};
};

export default createFragmentCache;
