import { contentCacheTags, getCacheTagTokens } from "@lucidcms/core/extension";
import type { ServiceContext, Toolkit } from "@lucidcms/core/types";

/** Captures tokens before content reads so concurrent changes invalidate stored pages. */
const trackContentReads = (toolkit: Toolkit, context: ServiceContext) => {
	const tokens = new Map<string, Promise<string>>();

	const track = (collectionKey: string) => {
		const tag = contentCacheTags.collection(collectionKey);
		const existing = tokens.get(tag);
		if (existing) return existing;

		const token = getCacheTagTokens(context, [tag]).then(
			(result) => result[tag] ?? "",
		);
		tokens.set(tag, token);
		return token;
	};

	const documents: Toolkit["documents"] = {
		...toolkit.documents,
		getSingle: async (input) => {
			await track(input.collectionKey);
			return toolkit.documents.getSingle(input);
		},
		getMultiple: async (input) => {
			await track(input.collectionKey);
			return toolkit.documents.getMultiple(input);
		},
	};

	return {
		toolkit: { ...toolkit, documents },
		tokens: async (): Promise<Record<string, string>> =>
			Object.fromEntries(
				await Promise.all(
					[...tokens].map(async ([tag, token]) => [tag, await token] as const),
				),
			),
	};
};

export default trackContentReads;
