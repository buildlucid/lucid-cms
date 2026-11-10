import CollectionDefinition from "./definitions/collection/index.js";
import type { CollectionOptions } from "./definitions/collection/types.js";
import type { FieldNode } from "./definitions/fields/types.js";

export type DefineCollectionOptions<TCollectionKey extends string> =
	CollectionOptions<TCollectionKey> & {
		/** Unique collection key, used in URLs, the content API and generated types. */
		key: TCollectionKey;
		/** The collection's own fields, built with `field`. Tabs go at the top level. */
		fields?: readonly FieldNode[];
	};

/**
 * Defines a document collection and its fields. Add it to `config.collections`.
 *
 * @example
 * ```ts
 * const pages = defineCollection({
 * 	key: "page",
 * 	mode: "multiple",
 * 	details: { labels: { singular: "Page", plural: "Pages" } },
 * 	revisions: true,
 * 	fields: [
 * 		field.text("title", {
 * 			useAsLabel: true,
 * 			validation: { required: true },
 * 		}),
 * 		field.repeater("links", { fields: [field.link("link")] }),
 * 	],
 * });
 * ```
 */
const defineCollection = <const TCollectionKey extends string>({
	key,
	fields,
	...options
}: DefineCollectionOptions<TCollectionKey>) =>
	new CollectionDefinition(key, options).insertFields(fields ?? []);

export default defineCollection;
