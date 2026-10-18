import type { Refs } from "@lucidcms/core/types";
import getRouteUrls from "./get-route-urls.js";
import resolveFields from "./resolve-fields.js";
import type { SiteFunctionsContext } from "./site-functions-context.js";
import type {
	CollectionFields,
	TemplateFields,
} from "./to-template-document.js";

/** A document a relation field or rich text points to, with its fields in the locale; its own references stay as stored. */
export type TemplateRelatedDocument<Key extends string = string> = {
	id: number;
	collectionKey: Key;
	locale: string;
	/** Route path in this document's locale. */
	url: string | null;
	/** Route paths keyed by locale. */
	urls: Record<string, string>;
	fields: TemplateFields<CollectionFields<Key>, Key, false>;
};

const toTemplateRelatedDocument = <Key extends string>(
	document: NonNullable<Refs["documents"]>[number],
	locale: string,
	context: Pick<SiteFunctionsContext, "locales" | "fieldTypes">,
): TemplateRelatedDocument<Key> => {
	const urls = getRouteUrls(document.route, locale);

	// The runtime shape is untyped; `TemplateFields` describes what `resolveFields` produced.
	return {
		id: document.id,
		collectionKey: document.collectionKey,
		locale,
		url: urls[locale] ?? null,
		urls,
		fields: resolveFields(document.fields ?? {}, {
			locale,
			locales: context.locales,
			types: context.fieldTypes(document.collectionKey),
			target: {
				collectionKey: document.collectionKey,
				documentId: document.id,
				locale,
				path: [],
			},
		}),
	} as TemplateRelatedDocument<Key>;
};

export default toTemplateRelatedDocument;
