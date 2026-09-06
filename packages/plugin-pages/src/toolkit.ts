import { defineToolkit } from "@lucidcms/core";
import type {
	CollectionDocumentFilters,
	CollectionDocumentKey,
	CoreToolkit,
	ToolkitDocumentsGetSingleInput,
	ToolkitDocumentsGetSingleQuery,
} from "@lucidcms/core/types";

/** Collection, version and full path to look up. Additional query options control included content. */
export type PagesGetByFullSlugInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
> = Omit<ToolkitDocumentsGetSingleInput<TCollectionKey>, "query"> & {
	/** The complete page path, including any locale or collection prefix. */
	fullSlug: string;
	query?: Omit<ToolkitDocumentsGetSingleQuery<TCollectionKey>, "filter">;
};

const createPagesToolkit = (core: CoreToolkit) => ({
	/** Finds a document in a pages collection by its full slug, including requested refs. */
	getByFullSlug: <TCollectionKey extends CollectionDocumentKey>({
		fullSlug,
		query,
		...input
	}: PagesGetByFullSlugInput<TCollectionKey>) =>
		core.documents.getSingle({
			...input,
			query: {
				...query,
				// Pages registers this field; collection filter types come from the consuming project.
				filter: {
					_fullSlug: { value: fullSlug },
				} as CollectionDocumentFilters<TCollectionKey>,
			},
		}),
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
