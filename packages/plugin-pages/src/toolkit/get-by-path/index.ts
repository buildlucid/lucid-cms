import { runToolkitService } from "@lucidcms/core/toolkit";
import type {
	CollectionDocumentFilters,
	CollectionDocumentKey,
	ContentLocaleInput,
	CoreToolkit,
	ToolkitDocumentsGetSingleInput,
} from "@lucidcms/core/types";

/** Collection, version and path to look up, with the other document read options such as `include`. */
export type PagesGetByPathInput<
	TCollectionKey extends CollectionDocumentKey = CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
> = Omit<
	ToolkitDocumentsGetSingleInput<TCollectionKey, TLocale>,
	"filter" | "locale"
> &
	ContentLocaleInput<TLocale> & {
		/** The complete page path, including any locale or collection prefix. */
		path: string;
	};

/** Finds a document in a pages collection by its path, as the content API returns it, or null when no page has it. */
const getByPath = <
	TCollectionKey extends CollectionDocumentKey,
	TLocale extends string | undefined = undefined,
>(
	core: CoreToolkit,
	input: PagesGetByPathInput<TCollectionKey, TLocale>,
) =>
	runToolkitService({
		handler: () => {
			const { path, ...options } = input;
			return core.documents.getSingle({
				...options,
				// Pages registers this field; collection filter types come from the consuming project.
				filter: {
					fields: { path },
				} as CollectionDocumentFilters<TCollectionKey>,
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
