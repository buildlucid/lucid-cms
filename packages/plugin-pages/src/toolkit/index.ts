import { defineToolkit } from "@lucidcms/core/toolkit";
import type { CollectionDocumentKey, CoreToolkit } from "@lucidcms/core/types";
import getByFullSlug, {
	type PagesGetByFullSlugInput,
} from "./get-by-full-slug/index.js";

const createPagesToolkit = (core: CoreToolkit) => ({
	/** Finds a document in a pages collection by its full slug, as the content API returns it. */
	getByFullSlug: <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: PagesGetByFullSlugInput<TCollectionKey, TLocale>,
	) => getByFullSlug(core, input),
});

/** Page lookup helpers available on toolkit.pages when the pages plugin is configured. */
export type PagesToolkit = ReturnType<typeof createPagesToolkit>;

declare module "@lucidcms/core/types" {
	interface ToolkitServices {
		pages: PagesToolkit;
	}
}

export default defineToolkit({
	key: "pages",
	create: ({ core }) => createPagesToolkit(core),
});
