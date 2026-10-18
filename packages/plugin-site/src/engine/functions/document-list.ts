import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { CollectionDocumentKey, Toolkit } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import normalizeFilter from "../normalize-filter.js";
import type { SiteFunctionsContext } from "../site-functions-context.js";
import toTemplateDocument, {
	type TemplateDocument,
} from "../to-template-document.js";
import toTemplateList, {
	listDefaults,
	type TemplateList,
} from "../to-template-list.js";
import type { DocumentFilter, DocumentReadOptions } from "./document.js";

type ListInput = Parameters<Toolkit["documents"]["getMultiple"]>[0];

export type DocumentListOptions = DocumentReadOptions & {
	sort?: NonNullable<ListInput["query"]>["sort"];
	/** Defaults to 1. */
	page?: number;
	/** Defaults to 10; use -1 to return every match. */
	perPage?: number;
};

const createDocumentListFunction = (context: SiteFunctionsContext) =>
	withRender(
		async <Key extends CollectionDocumentKey>(
			render: RenderInfo<SiteState>,
			collectionKey: Key,
			options: DocumentListOptions = {},
		): Promise<TemplateList<TemplateDocument<Key>>> => {
			const page = options.page ?? listDefaults.page;
			const perPage = options.perPage ?? listDefaults.perPage;
			const version = context.getVersion(collectionKey, options.version);
			if (version === null) {
				return toTemplateList([], { total: 0, page, perPage });
			}
			render.tagCache(contentCacheTags.collection(collectionKey));

			const input: ListInput = {
				collectionKey,
				version,
				preview: render.state.preview?.token ?? null,
				query: {
					filter: normalizeFilter<DocumentFilter>(options.filter),
					sort: options.sort,
					page,
					perPage,
					include: options.include,
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

			const { data, count, refs = {} } = response.data;
			if (refs.media?.length) render.tagCache(contentCacheTags.media);
			const locale = options.locale ?? context.defaultLocale;
			return toTemplateList(
				data.map((document) =>
					toTemplateDocument<Key>({
						document,
						refs,
						locale,
						context,
					}),
				),
				{ total: count, page, perPage },
			);
		},
	);

export default createDocumentListFunction;
