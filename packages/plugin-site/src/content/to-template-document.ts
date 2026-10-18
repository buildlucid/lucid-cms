import type { PreviewFieldTarget } from "@lucidcms/client/markup";
import type {
	CollectionDocumentBricksByCollection,
	CollectionDocumentFieldsByCollection,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	DocumentBrick,
	fieldValueKind,
	Refs,
	RelationFieldValue,
	Toolkit,
} from "@lucidcms/core/types";
import { fieldTargets } from "../preview/field-targets.js";
import type { SiteConfig } from "../site/create-site-config.js";
import isRecord from "../utils/is-record.js";
import getRouteUrls from "./get-route-urls.js";
import resolveFields, { type FieldResolvers } from "./resolve-fields.js";
import toTemplateMedia, { type TemplateMedia } from "./to-template-media.js";
import toTemplateRelatedDocument, {
	type TemplateRelatedDocument,
} from "./to-template-related-document.js";
import toTemplateRichText, {
	type TemplateRichTextNode,
} from "./to-template-rich-text.js";
import toTemplateUser, { type TemplateUser } from "./to-template-user.js";

export type ToolkitDocument = NonNullable<
	Awaited<ReturnType<Toolkit["documents"]["getSingle"]>>["data"]
>["document"];

/** A collection's generated fields and bricks, or untyped ones before types are generated. */
export type CollectionFields<Key extends string> = [Key] extends [
	keyof CollectionDocumentFieldsByCollection,
]
	? CollectionDocumentFieldsByCollection[Key]
	: Record<string, unknown>;
type CollectionBrick<Key extends string> = [Key] extends [
	keyof CollectionDocumentBricksByCollection,
]
	? CollectionDocumentBricksByCollection[Key]
	: DocumentBrick;

/** Matches `resolveFields` by localizing translations and nested repeater, section and collapsible fields while preserving other known object shapes. */
type PlainValue<
	Value,
	Key extends string,
	References extends boolean,
> = Value extends readonly (infer Item)[]
	? Item extends Record<string, unknown>
		? TemplateFields<Item, Key, References>[]
		: Value
	: Value extends Record<string, unknown>
		? string extends keyof Value
			? Value
			: [keyof Value] extends [never]
				? Value
				: [keyof Value] extends [CollectionDocumentLocaleCode<Key>]
					? TemplateValue<Value[keyof Value], Key, References> | null
					: TemplateFields<Value, Key, References>
		: Value;

/** Template values for field types whose JSON looks like other fields', keyed by the type `fieldValueKind` names. */
type KindValues = {
	media: TemplateMedia[];
	user: TemplateUser[];
	"rich-text": TemplateRichTextNode;
};

/** With references, media and user IDs become media and users, relations become related documents and rich text becomes nodes. */
type TemplateValue<
	Value,
	Key extends string,
	References extends boolean,
> = Value extends unknown
	? References extends true
		? typeof fieldValueKind extends keyof Value
			? KindValues[Extract<
					NonNullable<Value[typeof fieldValueKind]>,
					keyof KindValues
				>]
			: Value extends readonly RelationFieldValue<infer Related>[]
				? Array<
						Related extends string ? TemplateRelatedDocument<Related> : never
					>
				: PlainValue<Value, Key, References>
		: PlainValue<Value, Key, References>
	: never;

export type TemplateFields<
	Fields,
	Key extends string = string,
	References extends boolean = true,
> = string extends keyof Fields
	? Record<string, unknown>
	: { [Name in keyof Fields]: TemplateValue<Fields[Name], Key, References> };

/** Bricks whose `type` can be `Type`, keeping untyped bricks. */
type BricksOfType<Brick, Type extends string> = Brick extends {
	type: infer BrickType;
}
	? Type extends BrickType
		? Brick
		: never
	: never;

export type TemplateBrick<
	Brick extends DocumentBrick = DocumentBrick,
	Key extends string = string,
> = Brick extends DocumentBrick
	? {
			id: number;
			key: Brick["key"];
			fields: TemplateFields<Brick["fields"], Key>;
		}
	: never;

/** A document with fields resolved for its locale and references filled in, typed from the collection's generated types. */
export type TemplateDocument<
	Key extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	id: number;
	collectionKey: Key;
	locale: string;
	/** Route path in this document's locale. */
	url: string | null;
	/** Route paths keyed by locale, such as for language links. */
	urls: Record<string, string>;
	updatedAt: string | null;
	versionId: number | null;
	fields: TemplateFields<CollectionFields<Key>, Key>;
	bricks: TemplateBrick<BricksOfType<CollectionBrick<Key>, "builder">, Key>[];
	fixed: {
		[Brick in BricksOfType<
			CollectionBrick<Key>,
			"fixed"
		> as Brick["key"]]?: TemplateBrick<Brick, Key>;
	};
};

/** What converting a document reads from the site: its locales and field types. */
export type TemplateDocumentConfig = Pick<SiteConfig, "locales" | "fieldTypes">;

/** Converts each reference once, so a media item or document used twice is the same object. */
const once = <Value>(create: (key: string) => Value) => {
	const values = new Map<string, { value: Value }>();
	return (key: string): Value => {
		const cached = values.get(key);
		if (cached) return cached.value;

		const value = create(key);
		values.set(key, { value });
		return value;
	};
};

const toTemplateDocument = <Key extends CollectionDocumentKey>(props: {
	document: ToolkitDocument;
	refs: Refs;
	locale: string;
	config: TemplateDocumentConfig;
}): TemplateDocument<Key> => {
	const { document, refs, locale, config } = props;
	const { locales } = config;
	const bricks = document.bricks ?? [];
	const urls = getRouteUrls(document.route, locale);
	const target: PreviewFieldTarget = {
		collectionKey: document.collectionKey,
		documentId: document.id,
		locale,
		path: [],
	};

	const media = once((id) => {
		const item = refs.media?.find((entry) => String(entry.id) === id);
		return item ? toTemplateMedia(item, locale) : null;
	});
	const user = once((id) => {
		const item = refs.users?.find((entry) => String(entry.id) === id);
		return item ? toTemplateUser(item, locale) : null;
	});
	const related = once((id) => {
		const item = refs.documents?.find(
			(entry) => `${entry.collectionKey}:${entry.id}` === id,
		);
		return item ? toTemplateRelatedDocument(item, locale, config) : null;
	});
	const embedded = once((ref) => {
		const brick = bricks.find(
			(item) => item.type === "embedded" && item.ref === ref,
		);
		return brick ? toBrick(brick) : null;
	});

	const resolvers: FieldResolvers = {
		media: (value) =>
			Array.isArray(value)
				? value.flatMap((id) => media(String(id)) ?? [])
				: value,
		user: (value) =>
			Array.isArray(value)
				? value.flatMap((id) => user(String(id)) ?? [])
				: value,
		relation: (value) =>
			Array.isArray(value)
				? value.flatMap((item) =>
						isRecord(item)
							? (related(`${item.collectionKey}:${item.id}`) ?? [])
							: [],
					)
				: value,
		"rich-text": (value) =>
			toTemplateRichText(
				value,
				{ document, refs },
				{
					brick: embedded,
					document: (collectionKey, id) => related(`${collectionKey}:${id}`),
				},
			),
	};

	// The lookups above call this lazily, once fields resolve below.
	const toBrick = (brick: (typeof bricks)[number]) => {
		// Previews can't point at embedded bricks, so their fields get no target.
		const brickTarget: PreviewFieldTarget | null =
			brick.type === "embedded"
				? null
				: {
						...target,
						brick: { type: brick.type, key: brick.key, order: brick.order },
					};
		const templateBrick = {
			id: brick.id,
			key: brick.key,
			fields: resolveFields(brick.fields, {
				locale,
				locales,
				target: brickTarget,
				types: config.fieldTypes(document.collectionKey, brick.key),
				resolvers,
			}),
		};
		if (brickTarget) fieldTargets.set(templateBrick, brickTarget);
		// The runtime shape is untyped; `TemplateFields` describes what `resolveFields` produced.
		return templateBrick as TemplateBrick;
	};

	const templateDocument = {
		id: document.id,
		collectionKey: document.collectionKey,
		locale,
		url: urls[locale] ?? null,
		urls,
		updatedAt: document.meta?.updatedAt ?? null,
		versionId: document.meta?.versionId ?? null,
		fields: resolveFields(document.fields, {
			locale,
			locales,
			target,
			types: config.fieldTypes(document.collectionKey),
			resolvers,
		}),
		bricks: bricks.filter((brick) => brick.type === "builder").map(toBrick),
		fixed: Object.fromEntries(
			bricks
				.filter((brick) => brick.type === "fixed")
				.map((brick) => [brick.key, toBrick(brick)]),
		),
	};
	fieldTargets.set(templateDocument, target);
	// The runtime shape is untyped; `TemplateFields` describes what `resolveFields` produced.
	return templateDocument as TemplateDocument<Key>;
};

export default toTemplateDocument;
