import { runToolkitService } from "@lucidcms/core/toolkit";
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

/** Finds a document in a pages collection by its full slug, including requested refs. */
const getByFullSlug = <TCollectionKey extends CollectionDocumentKey>(
	core: CoreToolkit,
	input: PagesGetByFullSlugInput<TCollectionKey>,
) =>
	runToolkitService({
		handler: () => {
			const { fullSlug, query, ...options } = input;
			return core.documents.getSingle({
				...options,
				query: {
					...query,
					// Pages registers this field; collection filter types come from the consuming project.
					filter: {
						_fullSlug: { value: fullSlug },
					} as CollectionDocumentFilters<TCollectionKey>,
				},
			});
		},
		name: {
			key: "plugin.pages.toolkit.get-by-full-slug.error.name",
			defaultMessage: "Pages Toolkit Error",
		},
		message: {
			key: "plugin.pages.toolkit.get-by-full-slug.error.message",
			defaultMessage: "Lucid toolkit could not find the page by its full slug.",
		},
	});

export default getByFullSlug;
