import { getCacheTagTokens } from "@lucidcms/core/extension";
import type { ServiceContext } from "@lucidcms/core/types";

const memos = new WeakMap<ServiceContext, Map<string, Promise<string>>>();

const memoOf = (context: ServiceContext) => {
	const existing = memos.get(context);
	if (existing) return existing;

	const memo = new Map<string, Promise<string>>();
	memos.set(context, memo);
	return memo;
};

/**
 * Resolves each cache tag's token once per request, as every request gets its own context. A token is kept from when
 * it was first asked for, so a read that awaits it still captures one from before the read.
 */
const readCacheTagTokens = async (
	context: ServiceContext,
	tags: string[],
): Promise<Record<string, string>> => {
	const memo = memoOf(context);
	const missing = [...new Set(tags)].filter((tag) => !memo.has(tag));
	if (missing.length > 0) {
		const pending = getCacheTagTokens(context, missing);
		for (const tag of missing) {
			memo.set(
				tag,
				pending.then((tokens) => tokens[tag] ?? ""),
			);
		}
	}

	return Object.fromEntries(
		await Promise.all(
			tags.map(async (tag) => [tag, (await memo.get(tag)) ?? ""] as const),
		),
	);
};

export default readCacheTagTokens;
