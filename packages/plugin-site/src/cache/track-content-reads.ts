import { contentCacheTags } from "@lucidcms/core/extension";
import type { ServiceContext, Toolkit } from "@lucidcms/core/types";
import readCacheTagTokens from "./read-cache-tag-tokens.js";

/** Captures tokens before content reads so concurrent changes invalidate stored pages; the request's memo keeps the first token each tag resolved to. */
const trackContentReads = (toolkit: Toolkit, context: ServiceContext) => {
	const tracked = new Set<string>();

	const track = async (...tags: string[]) => {
		for (const tag of tags) tracked.add(tag);
		await readCacheTagTokens(context, tags);
	};

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
		/** The tokens of every tag the page read, as they were before its first read of each. */
		tokens: () => readCacheTagTokens(context, [...tracked]),
	};
};

export default trackContentReads;
