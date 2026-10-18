import { contentCacheTags, getCacheTagTokens } from "@lucidcms/core/extension";
import type { ServiceContext, Toolkit } from "@lucidcms/core/types";

/** Captures tokens before content reads so concurrent changes invalidate stored pages. */
const trackContentReads = (toolkit: Toolkit, context: ServiceContext) => {
	const tokens = new Map<string, Promise<string>>();

	const track = (...tags: string[]) =>
		Promise.all(
			tags.map((tag) => {
				const existing = tokens.get(tag);
				if (existing) return existing;

				const token = getCacheTagTokens(context, [tag]).then(
					(result) => result[tag] ?? "",
				);
				tokens.set(tag, token);
				return token;
			}),
		);

	// Document reads include their media, which media changes don't rotate the collection's token for.
	const documents: Toolkit["documents"] = {
		...toolkit.documents,
		getSingle: async (input) => {
			await track(
				contentCacheTags.collection(input.collectionKey),
				contentCacheTags.media,
			);
			return toolkit.documents.getSingle(input);
		},
		getMultiple: async (input) => {
			await track(
				contentCacheTags.collection(input.collectionKey),
				contentCacheTags.media,
			);
			return toolkit.documents.getMultiple(input);
		},
	};
	const media: Toolkit["media"] = {
		...toolkit.media,
		// Media includes other media, such as active crops and video posters, so any media change makes the read stale.
		getSingle: async (input) => {
			await track(contentCacheTags.media);
			return toolkit.media.getSingle(input);
		},
		getMultiple: async (input) => {
			await track(contentCacheTags.media);
			return toolkit.media.getMultiple(input);
		},
		resolveUrl: async (input) => {
			await track(contentCacheTags.media);
			return toolkit.media.resolveUrl(input);
		},
	};

	return {
		toolkit: { ...toolkit, documents, media },
		tokens: async (): Promise<Record<string, string>> =>
			Object.fromEntries(
				await Promise.all(
					[...tokens].map(async ([tag, token]) => [tag, await token] as const),
				),
			),
	};
};

export default trackContentReads;
