import { contentCacheTags, getCacheTagTokens } from "@lucidcms/core/extension";
import type { KilnCache } from "@lucidkiln/core";
import { storeKeys } from "../constants.js";
import type { SiteState } from "../types.js";
import readCacheTagTokens from "./read-cache-tag-tokens.js";
import storeLifetime from "./store-lifetime.js";

type Fragment = { value: string; tokens: Record<string, string> };

/** Kiln's fragment store, shared by every request the site serves, which reads KV with the context of the render's request. */
const createFragmentCache = (): KilnCache<SiteState> => {
	// Tokens at cache misses prevent saving fragments rendered across a content change.
	const guards = [contentCacheTags.documents, contentCacheTags.media];
	const missed = new Map<string, string>();
	const guardToken = (tokens: Record<string, string>) =>
		guards.map((tag) => tokens[tag] ?? "").join("|");

	return {
		get: async ({ key, state }) => {
			const { context } = state;
			const fragment = await context.kv.get<Fragment>(context, {
				key: storeKeys.fragment(key),
				hash: true,
			});
			const tags = Object.keys(fragment?.tokens ?? {});
			const tokens = await readCacheTagTokens(context, [...guards, ...tags]);
			if (
				fragment &&
				tags.every((tag) => tokens[tag] === fragment.tokens[tag])
			) {
				return fragment.value;
			}

			missed.set(key, guardToken(tokens));
			return null;
		},
		set: async ({ key, value, seconds, tags, state }) => {
			const seen = missed.get(key);
			missed.delete(key);

			// Read afresh rather than from the request's memo, which would always match what the miss saw.
			const { context } = state;
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
