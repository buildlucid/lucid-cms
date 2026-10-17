import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { CollectionDocumentKey, Toolkit } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import normalizeDocumentFilter from "../normalize-document-filter.js";
import type { SiteFunctionsContext } from "../site-functions-context.js";
import toTemplateDocument, {
	type TemplateDocument,
} from "../to-template-document.js";
import type { DocumentReadOptions } from "./document.js";

type ListInput = Parameters<Toolkit["documents"]["getMultiple"]>[0];

export type DocumentsOptions = DocumentReadOptions & {
	sort?: NonNullable<ListInput["query"]>["sort"];
	page?: number;
	/** Use -1 to return every match. */
	perPage?: number;
};

const createDocumentsFunction = (context: SiteFunctionsContext) =>
	withRender(
		async <Key extends CollectionDocumentKey>(
			render: RenderInfo<SiteState>,
			collectionKey: Key,
			options: DocumentsOptions = {},
		): Promise<TemplateDocument<Key>[]> => {
			const version = context.getVersion(collectionKey, options.version);
			if (version === null) return [];
			render.tagCache(contentCacheTags.collection(collectionKey));

			const input: ListInput = {
				collectionKey,
				version,
				preview: render.state.preview?.token ?? null,
				query: {
					filter: normalizeDocumentFilter(options.filter),
					sort: options.sort,
					page: options.page,
					perPage: options.perPage,
					include: ["bricks", "meta"],
				},
			};
			let response = await render.state.toolkit.documents.getMultiple(input);
			if (response.error?.code === "preview_scope") {
				response = await render.state.toolkit.documents.getMultiple({
					...input,
					preview: null,
				});
			}
			if (response.error) throw new LucidAPIError(response.error);

			const locale = options.locale ?? context.defaultLocale;
			return response.data.data.map((document) =>
				toTemplateDocument<Key>(document, locale, context.locales),
			);
		},
	);

export default createDocumentsFunction;
