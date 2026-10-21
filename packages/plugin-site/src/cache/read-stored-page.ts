import type { ServiceContext } from "@lucidcms/core/types";
import readCacheTagTokens from "./read-cache-tag-tokens.js";

export type StoredPage = {
	body: string;
	contentType: string;
	tokens: Record<string, string>;
};

const readStoredPage = async (
	context: ServiceContext,
	key: string,
): Promise<StoredPage | null> => {
	const page = await context.kv.get<StoredPage>(context, { key, hash: true });
	if (!page) return null;

	const tags = Object.keys(page.tokens);
	if (tags.length === 0) return page;

	const current = await readCacheTagTokens(context, tags);
	return tags.every((tag) => current[tag] === page.tokens[tag]) ? page : null;
};

export default readStoredPage;
