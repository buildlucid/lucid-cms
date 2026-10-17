import type { PreviewFieldTarget } from "@lucidcms/client/markup";
import type {
	CollectionDocumentBricksByCollection,
	CollectionDocumentFieldsByCollection,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	DocumentBrick,
	Toolkit,
} from "@lucidcms/core/types";
import { fieldTargets } from "./field-targets.js";
import resolveFields from "./resolve-fields.js";

type ToolkitDocument = NonNullable<
	Awaited<ReturnType<Toolkit["documents"]["getSingle"]>>["data"]
>["document"];

/** A collection's generated fields and bricks, or untyped ones before types are generated. */
type CollectionFields<Key extends string> = [Key] extends [
	keyof CollectionDocumentFieldsByCollection,
]
	? CollectionDocumentFieldsByCollection[Key]
	: Record<string, unknown>;
type CollectionBrick<Key extends string> = [Key] extends [
	keyof CollectionDocumentBricksByCollection,
]
	? CollectionDocumentBricksByCollection[Key]
	: DocumentBrick;

/** Mirrors `resolveFields`: translations become the locale's value, and repeater groups resolve the same way. */
type TemplateValue<
	Value,
	Key extends string,
> = Value extends readonly (infer Item)[]
	? Item extends Record<string, unknown>
		? TemplateFields<Item, Key>[]
		: Value
	: Value extends Record<string, unknown>
		? string extends keyof Value
			? Value
			: [keyof Value] extends [never]
				? Value
				: [keyof Value] extends [CollectionDocumentLocaleCode<Key>]
					? TemplateValue<Value[keyof Value], Key> | null
					: Value
		: Value;

export type TemplateFields<
	Fields,
	Key extends string = string,
> = string extends keyof Fields
	? Record<string, unknown>
	: { [Name in keyof Fields]: TemplateValue<Fields[Name], Key> };

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

/** A document with fields resolved for its locale, typed from the collection's generated types. */
export type TemplateDocument<
	Key extends CollectionDocumentKey = CollectionDocumentKey,
> = {
	id: number;
	collectionKey: Key;
	locale: string;
	/** Route path in this document's locale. */
	url: string | null;
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

const toTemplateDocument = <Key extends CollectionDocumentKey>(
	document: ToolkitDocument,
	locale: string,
	locales: ReadonlySet<string>,
): TemplateDocument<Key> => {
	const routePath = document.route?.path;
	const bricks = document.bricks ?? [];
	const target: PreviewFieldTarget = {
		collectionKey: document.collectionKey,
		documentId: document.id,
		locale,
		path: [],
	};

	const toBrick = (brick: (typeof bricks)[number]) => {
		const brickTarget: PreviewFieldTarget = {
			...target,
			...(brick.type === "embedded"
				? {}
				: { brick: { type: brick.type, key: brick.key, order: brick.order } }),
		};
		const templateBrick = {
			id: brick.id,
			key: brick.key,
			fields: resolveFields(brick.fields, {
				locale,
				locales,
				target: brickTarget,
			}),
		};
		fieldTargets.set(templateBrick, brickTarget);
		return templateBrick;
	};

	const templateDocument = {
		id: document.id,
		collectionKey: document.collectionKey,
		locale,
		url:
			typeof routePath === "object" && routePath !== null
				? (routePath[locale] ?? null)
				: (routePath ?? null),
		updatedAt: document.meta?.updatedAt ?? null,
		versionId: document.meta?.versionId ?? null,
		fields: resolveFields(document.fields, { locale, locales, target }),
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
