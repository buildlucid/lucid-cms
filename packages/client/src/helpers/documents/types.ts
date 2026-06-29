import type {
	CollectionDocument,
	CollectionDocumentLocaleCode,
	CollectionDocumentTranslations,
	DocumentBrick,
	DocumentFieldValueMap,
	DocumentRef,
	DocumentRelationValue,
	MediaRef,
	UserRef,
} from "../../types.js";

export type LocaleCode = CollectionDocumentLocaleCode | string;

type DocumentFieldsOf<TDocument extends CollectionDocument> =
	TDocument["fields"];

export type DocumentBrickItem<TDocument extends CollectionDocument> =
	NonNullable<NonNullable<TDocument["bricks"]>[number]>;

export type DocumentBrickKeyOf<TDocument extends CollectionDocument> = Extract<
	DocumentBrickItem<TDocument>["key"],
	string
>;

export type DocumentBrickTypeOf<TDocument extends CollectionDocument> = Extract<
	DocumentBrickItem<TDocument>["type"],
	string
>;

export type DocumentBrickByKey<
	TDocument extends CollectionDocument,
	TKey extends DocumentBrickKeyOf<TDocument>,
> = Extract<DocumentBrickItem<TDocument>, { key: TKey }>;

type FilterKeyOf<TFilter> = Extract<
	TFilter extends { key?: infer TKey } ? TKey : never,
	string
>;

type FilterTypeOf<TFilter> = Extract<
	TFilter extends { type?: infer TType } ? TType : never,
	string
>;

type BrickMatchShape<TKey extends string, TType extends string> = ([
	TKey,
] extends [never]
	? unknown
	: { key: TKey }) &
	([TType] extends [never] ? unknown : { type: TType });

export type DocumentBrickFilter<
	TDocument extends CollectionDocument = CollectionDocument,
> =
	| {
			key: DocumentBrickKeyOf<TDocument>;
			type?: DocumentBrickTypeOf<TDocument>;
	  }
	| {
			type: DocumentBrickTypeOf<TDocument>;
			key?: DocumentBrickKeyOf<TDocument>;
	  };

export type DocumentBrickByFilter<
	TDocument extends CollectionDocument,
	TFilter extends DocumentBrickFilter<TDocument>,
> = Extract<
	DocumentBrickItem<TDocument>,
	BrickMatchShape<FilterKeyOf<TFilter>, FilterTypeOf<TFilter>>
>;

export type FieldKeyOf<TFields extends DocumentFieldValueMap> = Extract<
	keyof TFields,
	string
>;

export type DocumentViewOptions = {
	locale?: LocaleCode;
};

export type DocumentViewOptionsWithLocale = {
	locale: LocaleCode;
};

export type DocumentRefType = "document" | "media" | "user" | (string & {});

export type DocumentRefValue<TRefType extends DocumentRefType> =
	TRefType extends "document"
		? DocumentRelationValue[]
		: TRefType extends "media" | "user"
			? number[]
			: unknown;

export type DocumentRefsResult<TRefType extends DocumentRefType> =
	TRefType extends "document"
		? Array<DocumentRef<string, DocumentFieldValueMap | null>>
		: TRefType extends "media"
			? Array<NonNullable<MediaRef>>
			: TRefType extends "user"
				? Array<NonNullable<UserRef>>
				: unknown[];

export type DocumentRefResult<TRefType extends DocumentRefType> =
	| DocumentRefsResult<TRefType>[number]
	| undefined;

export type DocumentFieldLocaleValueResult<TValue> =
	TValue extends Array<unknown>
		? TValue
		: TValue extends CollectionDocumentTranslations<infer TLocaleValue>
			? TLocaleValue | undefined
			: TValue;

export type DocumentFieldValueResult<
	TValue,
	THasLocale extends boolean,
> = THasLocale extends true ? DocumentFieldLocaleValueResult<TValue> : TValue;

export type GroupFieldsOf<TValue> =
	TValue extends Array<infer TItem>
		? TItem extends DocumentFieldValueMap
			? TItem
			: never
		: never;

export type DocumentFieldView<
	TDocument extends CollectionDocument = CollectionDocument,
	TValue = unknown,
	THasLocale extends boolean = false,
> = {
	raw: TValue;
	key: string;
	/** Returns a new field view that reads translated values for the locale. */
	withLocale: (
		locale: LocaleCode,
	) => DocumentFieldView<TDocument, TValue, true>;
	/** Returns the field value, selecting a translated value when a locale is set. */
	value: {
		(): DocumentFieldValueResult<TValue, THasLocale>;
		(
			options: DocumentViewOptionsWithLocale,
		): DocumentFieldValueResult<TValue, true>;
		(
			options?: DocumentViewOptions,
		): DocumentFieldValueResult<TValue, THasLocale>;
	};
	/** Returns hydrated refs for this field from the document refs map. */
	refs: <TRefType extends DocumentRefType>(
		refType: TRefType,
		options?: DocumentViewOptions,
	) => DocumentRefsResult<TRefType>;
	/** Returns the first hydrated ref for this field, when present. */
	ref: <TRefType extends DocumentRefType>(
		refType: TRefType,
		options?: DocumentViewOptions,
	) => DocumentRefResult<TRefType>;
	/** Returns repeater groups for this field as plain field views. */
	groups: () => Array<
		DocumentFieldGroupView<TDocument, GroupFieldsOf<TValue>, THasLocale>
	>;
};

export type FieldAccessorMethods<
	TDocument extends CollectionDocument,
	TFields extends DocumentFieldValueMap,
	THasLocale extends boolean = false,
> = {
	/** Returns a typed view for a field by key. */
	field: <TKey extends FieldKeyOf<TFields>>(
		key: TKey,
	) => DocumentFieldView<TDocument, TFields[TKey], THasLocale>;
};

export type DocumentFieldGroupView<
	TDocument extends CollectionDocument = CollectionDocument,
	TFields extends DocumentFieldValueMap = DocumentFieldValueMap,
	THasLocale extends boolean = false,
> = {
	raw: TFields;
	/** Returns a new group view that reads translated values for the locale. */
	withLocale: (
		locale: LocaleCode,
	) => DocumentFieldGroupView<TDocument, TFields, true>;
} & FieldAccessorMethods<TDocument, TFields, THasLocale>;

export type DocumentBrickView<
	TDocument extends CollectionDocument = CollectionDocument,
	TBrick extends DocumentBrick = DocumentBrick,
	THasLocale extends boolean = false,
> = {
	raw: TBrick;
	id: TBrick["id"];
	ref: TBrick["ref"];
	key: TBrick["key"];
	order: TBrick["order"];
	type: TBrick["type"];
	/** Returns a new brick view that reads translated values for the locale. */
	withLocale: (
		locale: LocaleCode,
	) => DocumentBrickView<TDocument, TBrick, true>;
} & FieldAccessorMethods<TDocument, TBrick["fields"], THasLocale>;

export type DocumentView<
	TDocument extends CollectionDocument = CollectionDocument,
	THasLocale extends boolean = false,
> = {
	raw: TDocument;
	id: TDocument["id"];
	collectionKey: TDocument["collectionKey"];
	/** Returns a new document view that reads translated values for the locale. */
	withLocale: (locale: LocaleCode) => DocumentView<TDocument, true>;
	/** Returns the first matching brick by key or filter, ordered like the response. */
	brick: {
		<TKey extends DocumentBrickKeyOf<TDocument>>(
			key: TKey,
		):
			| DocumentBrickView<
					TDocument,
					DocumentBrickByKey<TDocument, TKey>,
					THasLocale
			  >
			| undefined;
		<TFilter extends DocumentBrickFilter<TDocument>>(
			filter: TFilter,
		):
			| DocumentBrickView<
					TDocument,
					DocumentBrickByFilter<TDocument, TFilter>,
					THasLocale
			  >
			| undefined;
	};
	/** Returns matching bricks by key or filter, ordered like the response. */
	bricks: {
		(): Array<
			DocumentBrickView<TDocument, DocumentBrickItem<TDocument>, THasLocale>
		>;
		<TKey extends DocumentBrickKeyOf<TDocument>>(
			key: TKey,
		): Array<
			DocumentBrickView<
				TDocument,
				DocumentBrickByKey<TDocument, TKey>,
				THasLocale
			>
		>;
		<TFilter extends DocumentBrickFilter<TDocument>>(
			filter: TFilter,
		): Array<
			DocumentBrickView<
				TDocument,
				DocumentBrickByFilter<TDocument, TFilter>,
				THasLocale
			>
		>;
	};
	/** Returns hydrated refs for stored relation values from the document refs map. */
	refs: <TRefType extends DocumentRefType>(
		refType: TRefType,
		value: DocumentRefValue<TRefType>,
	) => DocumentRefsResult<TRefType>;
	/** Returns the first hydrated ref for stored relation values, when present. */
	ref: <TRefType extends DocumentRefType>(
		refType: TRefType,
		value: DocumentRefValue<TRefType>,
	) => DocumentRefResult<TRefType>;
} & FieldAccessorMethods<TDocument, DocumentFieldsOf<TDocument>, THasLocale>;
