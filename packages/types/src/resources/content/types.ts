import type {
	CollectionDocument,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	CollectionDocumentVersionKey,
	DocumentRoute,
	DocumentVersionSummary,
	fieldValueKind,
	RelationFieldValue,
} from "../documents/types.js";
import type { EmailRef } from "../emails/types.js";
import type { Media, MediaListItem } from "../media/types.js";
import type { UserDisplay } from "../users/types.js";

/** A route read in one locale, with every locale's path for language links. */
export type LocalizedDocumentRoute<TCollectionKey extends string = string> = {
	path: string | null;
	label: string | null;
	alternates: Partial<
		Record<CollectionDocumentLocaleCode<TCollectionKey>, string | null>
	>;
};

type MediaTextKey = "title" | "alt" | "description" | "summary" | "transcript";

/** Media with its text, such as `alt`, read in one locale, including a video poster's. */
export type LocalizedMedia<TMedia = Media> = TMedia extends unknown
	? {
			[TKey in keyof TMedia]: TKey extends MediaTextKey
				? string | null
				: TKey extends "poster"
					? LocalizedMedia<TMedia[TKey]>
					: TMedia[TKey];
		}
	: never;

export type LocalizedUser<TUser extends UserDisplay = UserDisplay> = Omit<
	TUser,
	"profilePicture"
> & {
	profilePicture: LocalizedMedia<NonNullable<TUser["profilePicture"]>> | null;
};

/** Uses a union to preserve possibly undefined locale inputs in result inference, which optional generic properties would narrow. */
export type ContentLocaleInput<
	TLocale extends string | undefined = undefined,
> =
	| {
			/** Reads translations in this locale, or each collection's default when it doesn't have it. */
			locale: TLocale;
	  }
	| { locale?: undefined };

/** Whether a read with this `locale` input returns localized content. */
export type IsLocalized<TLocale extends string | null | undefined> = [
	TLocale,
] extends [string]
	? true
	: [TLocale] extends [null | undefined]
		? false
		: boolean;

/** Media, localized when read with a `locale`. */
export type ContentMedia<
	TMedia extends Media | MediaListItem = Media,
	TLocalized extends boolean = false,
> = TLocalized extends true ? LocalizedMedia<TMedia> : TMedia;

/** A user a user field or document meta points to, as the content API fills them in. */
export type ContentUser<TLocalized extends boolean = false> =
	TLocalized extends true ? LocalizedUser : UserDisplay;

/** An email an email field points to, as the content API fills them in, without recipients or delivery status. */
export type ContentEmail = Omit<
	EmailRef,
	"to" | "cc" | "bcc" | "currentStatus"
>;

/** A route, read in one locale with a `locale`. */
export type ContentRoute<
	TCollectionKey extends string = string,
	TLocalized extends boolean = false,
> = TLocalized extends true
	? LocalizedDocumentRoute<TCollectionKey>
	: DocumentRoute<TCollectionKey>;

/** Values for field types whose stored JSON points at other content, keyed by the type `fieldValueKind` names. */
type ContentKindValues<TLocalized extends boolean> = {
	media: ContentMedia<Media, TLocalized>[];
	user: ContentUser<TLocalized>[];
	email: ContentEmail[];
};

/** A single field value with its media and users filled in and relations as related documents. */
type ContentLeafValue<
	TValue,
	TLocalized extends boolean,
> = TValue extends unknown
	? typeof fieldValueKind extends keyof TValue
		? NonNullable<
				TValue[typeof fieldValueKind]
			> extends keyof ContentKindValues<TLocalized>
			? ContentKindValues<TLocalized>[NonNullable<
					TValue[typeof fieldValueKind]
				>]
			: TValue
		: TValue extends readonly RelationFieldValue<infer TRelated>[]
			? Array<
					TRelated extends string
						? ContentRelatedDocument<TRelated, TLocalized>
						: never
				>
			: TValue
	: never;

/** Resolves translations to one value or null when localized, a locale map when unlocalized or `unknown` when uncertain, and recursively resolves untranslated repeaters and sections. */
type ContentValue<TValue, TLocalized extends boolean> = TValue extends unknown
	? typeof fieldValueKind extends keyof TValue
		? NonNullable<TValue[typeof fieldValueKind]> extends "translations"
			? [TLocalized] extends [true]
				? ContentLeafValue<
						TValue[Exclude<keyof TValue, typeof fieldValueKind>],
						TLocalized
					> | null
				: [TLocalized] extends [false]
					? {
							[
								TLocale in Exclude<keyof TValue, typeof fieldValueKind>
							]: ContentLeafValue<TValue[TLocale], TLocalized>;
						}
					: unknown
			: ContentLeafValue<TValue, TLocalized>
		: TValue extends readonly RelationFieldValue<string>[]
			? ContentLeafValue<TValue, TLocalized>
			: TValue extends readonly (infer TItem)[]
				? TItem extends Record<string, unknown>
					? ContentFields<TItem, TLocalized>[]
					: TValue
				: TValue extends Record<string, unknown>
					? ContentFields<TValue, TLocalized>
					: TValue
	: never;

/** A collection's or brick's fields as content reads return them, typed from the generated collection types. */
export type ContentFields<
	TFields,
	TLocalized extends boolean = false,
> = string extends keyof TFields
	? Record<string, unknown>
	: { [TKey in keyof TFields]: ContentValue<TFields[TKey], TLocalized> };

/** A relation target with its references resolved through `depth`, or `{ id, collectionKey }` beyond it; unreadable targets within depth are omitted. */
export type ContentRelatedDocument<
	TCollectionKey extends string = string,
	TLocalized extends boolean = false,
> = {
	id: number;
	collectionKey: TCollectionKey;
	/** With `locale`, the locale its fields were read in, or null when its collection isn't localized. */
	locale?: CollectionDocumentLocaleCode<TCollectionKey> | null;
	route?: ContentRoute<TCollectionKey, TLocalized> | null;
	fields?: Record<string, unknown> | null;
};

type CollectionBrick<TCollectionKey extends string> = NonNullable<
	CollectionDocument<TCollectionKey>["bricks"]
>[number];

/** Bricks whose `type` can be `TType`, keeping untyped bricks. */
type BricksOfType<TBrick, TType extends string> = TBrick extends {
	type: infer TBrickType;
}
	? TType extends TBrickType
		? TBrick
		: never
	: never;

export type ContentBrick<
	TBrick extends { key: string; fields: unknown } = {
		key: string;
		fields: Record<string, unknown>;
	},
	TLocalized extends boolean = false,
> = TBrick extends unknown
	? {
			id: number;
			key: TBrick["key"];
			order: number;
			fields: ContentFields<TBrick["fields"], TLocalized>;
		}
	: never;

type ContentVersionSummary<TLocalized extends boolean> = Omit<
	DocumentVersionSummary,
	"createdBy" | "createdByRunId"
> & {
	createdBy: ContentUser<TLocalized> | null;
};

export type ContentDocumentMeta<
	TCollectionKey extends string = CollectionDocumentKey,
	TLocalized extends boolean = false,
> = {
	versionId: number | null;
	versions: Record<
		CollectionDocumentVersionKey<TCollectionKey>,
		ContentVersionSummary<TLocalized> | null
	>;
	createdAt: string | null;
	updatedAt: string | null;
	createdBy: ContentUser<TLocalized> | null;
	updatedBy: ContentUser<TLocalized> | null;
};

/** A content API document with resolved references, ordered builder bricks, keyed fixed bricks and rich-text `attrs.brick` embeds, localized to one locale when `TLocalized` is true. */
export type ContentDocument<
	TCollectionKey extends string = CollectionDocumentKey,
	TLocalized extends boolean = false,
> = {
	id: number;
	collectionKey: TCollectionKey;
	version: CollectionDocument<TCollectionKey>["version"];
	/** The requested locale or collection default used to read fields when `locale` is supplied, or null for unlocalized collections. */
	locale?: CollectionDocumentLocaleCode<TCollectionKey> | null;
	route: ContentRoute<TCollectionKey, TLocalized> | null;
	fields: ContentFields<
		CollectionDocument<TCollectionKey>["fields"],
		TLocalized
	>;
	/** Builder bricks in order, with `include: ["bricks"]`. */
	bricks?: Array<
		ContentBrick<
			BricksOfType<CollectionBrick<TCollectionKey>, "builder">,
			TLocalized
		>
	>;
	/** Fixed bricks by key, with `include: ["bricks"]`. */
	fixed?: {
		[
			TBrick in BricksOfType<
				CollectionBrick<TCollectionKey>,
				"fixed"
			> as TBrick["key"]
		]?: ContentBrick<TBrick, TLocalized>;
	};
	meta?: ContentDocumentMeta<TCollectionKey, TLocalized>;
};

/** Where a content list is, as the content API's response `meta` reports it. */
export type ContentPagination = {
	currentPage: number;
	perPage: number;
	total: number;
	lastPage: number;
};

/** A page of a content list and where it is. */
export type ContentList<TItem> = {
	items: TItem[];
	pagination: ContentPagination;
};
