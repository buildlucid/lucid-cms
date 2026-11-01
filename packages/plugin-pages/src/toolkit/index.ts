import { defineToolkit } from "@lucidcms/core/toolkit";
import type { CollectionDocumentKey, CoreToolkit } from "@lucidcms/core/types";
import getByPath, { type PagesGetByPathInput } from "./get-by-path/index.js";

const createPagesToolkit = (core: CoreToolkit) => ({
	/** Finds a document in a pages collection by its path, as the content API returns it. */
	getByPath: <
		TCollectionKey extends CollectionDocumentKey,
		TLocale extends string | undefined = undefined,
	>(
		input: PagesGetByPathInput<TCollectionKey, TLocale>,
	) => getByPath(core, input),
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
