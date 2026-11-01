import { runToolkitService } from "@lucidcms/core/toolkit";
import type {
	CollectionDocumentFilters,
	CollectionDocumentKey,
	ContentLocaleInput,
	CoreToolkit,
	ToolkitDocumentsGetSingleInput,
	ToolkitDocumentsGetSingleQuery,
} from "@lucidcms/core/types";

/** Collection, version and path to look up. Additional query options control included content. */
export type PagesGetByPathInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = Omit<
	ToolkitDocumentsGetSingleInput<TCollectionKey, TLocale>,
	"query" | "locale"
> &
	ContentLocaleInput<TLocale> & {
		/** The complete page path, including any locale or collection prefix. */
		path: string;
		query?: Omit<ToolkitDocumentsGetSingleQuery<TCollectionKey>, "filter">;
	};

/** Finds a document in a pages collection by its path, as the content API returns it. */
const getByPath = <
	TCollectionKey extends CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
>(
	core: CoreToolkit,
	input: PagesGetByPathInput<TCollectionKey, TLocale>,
) =>
	runToolkitService({
		handler: () => {
			const { path, query, ...options } = input;
			return core.documents.getSingle({
				...options,
				query: {
					...query,
					// Pages registers this field; collection filter types come from the consuming project.
					filter: {
						_path: { value: path },
					} as CollectionDocumentFilters<TCollectionKey>,
				},
			});
		},
		name: {
			key: "plugin.pages.toolkit.get-by-path.error.name",
		},
		message: {
			key: "plugin.pages.toolkit.get-by-path.error.message",
		},
	});

export default getByPath;
