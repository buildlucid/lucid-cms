import type {
	CollectionDocument,
	CollectionDocumentLocaleCode,
	DocumentBrick,
	DocumentField,
	DocumentFieldGroup,
	DocumentFieldMap,
	DocumentRef,
	DocumentRelationValue,
	GroupDocumentField,
	MediaRef,
	TranslatedDocumentField,
	UserRef,
	ValueDocumentField,
} from "../../types.js";

export type LocaleCode = CollectionDocumentLocaleCode | string;

type AnyValueField = ValueDocumentField<
	string,
	DocumentField["type"],
	unknown,
	boolean
>;

type AnyTranslatedField = TranslatedDocumentField<
	string,
	DocumentField["type"],
	unknown,
	boolean
>;

export type AnyLeafField = AnyValueField | AnyTranslatedField;

export type DocumentRelationField<
	TKey extends string = string,
	TCollectionKey extends string = string,
	THasGroupRef extends boolean = boolean,
> =
	| ValueDocumentField<
			TKey,
			"document",
			Array<DocumentRelationValue<TCollectionKey>>,
			THasGroupRef
	  >
	| TranslatedDocumentField<
			TKey,
			"document",
			Array<DocumentRelationValue<TCollectionKey>>,
			THasGroupRef
	  >;

export type MediaRelationField<
	TKey extends string = string,
	THasGroupRef extends boolean = boolean,
> =
	| ValueDocumentField<TKey, "media", number[], THasGroupRef>
	| TranslatedDocumentField<TKey, "media", number[], THasGroupRef>;

export type UserRelationField<
	TKey extends string = string,
	THasGroupRef extends boolean = boolean,
> =
	| ValueDocumentField<TKey, "user", number[], THasGroupRef>
	| TranslatedDocumentField<TKey, "user", number[], THasGroupRef>;

export type AnyRelationField =
	| DocumentRelationField
	| MediaRelationField
	| UserRelationField;

type AnyGroupField = GroupDocumentField<
	string,
	DocumentField["type"],
	DocumentFieldMap,
	boolean
>;

type KeysMatching<TFields extends DocumentFieldMap, TValue> = Extract<
	{
		[TKey in keyof TFields]-?: TFields[TKey] extends TValue ? TKey : never;
	}[keyof TFields],
	string
>;

export type FieldKeyOf<TFields extends DocumentFieldMap> = Extract<
	keyof TFields,
	string
>;

type GroupFieldsOfInternal<TField> =
	TField extends GroupDocumentField<
		string,
		DocumentField["type"],
		infer TFields,
		boolean
	>
		? TFields
		: never;

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

export type FieldGroupRefOf<TField extends DocumentField> = TField extends {
	groupRef: infer TGroupRef;
}
	? TGroupRef
	: undefined;

export type DocumentViewOptions = {
	locale?: LocaleCode;
};

export type DocumentFieldValueResult<TField extends DocumentField> =
	TField extends TranslatedDocumentField<
		string,
		DocumentField["type"],
		infer TValue,
		boolean
	>
		? TValue | undefined
		: TField extends ValueDocumentField<
					string,
					DocumentField["type"],
					infer TValue,
					boolean
				>
			? TValue
			: never;

export type DocumentFieldRefsResult<TField extends DocumentField> =
	TField extends DocumentRelationField<string, infer TCollectionKey, boolean>
		? Array<DocumentRef<TCollectionKey>>
		: TField extends MediaRelationField
			? Array<NonNullable<MediaRef>>
			: TField extends UserRelationField
				? Array<NonNullable<UserRef>>
				: never;

export type DocumentFieldRefResult<TField extends DocumentField> =
	| DocumentFieldRefsResult<TField>[number]
	| undefined;

type DocumentFieldViewValueMethods<TField extends DocumentField> =
	TField extends AnyLeafField
		? {
				value: (
					options?: DocumentViewOptions,
				) => DocumentFieldValueResult<TField>;
			}
		: // biome-ignore lint/complexity/noBannedTypes: x
			{};

type DocumentFieldViewRelationMethods<TField extends DocumentField> =
	TField extends AnyRelationField
		? {
				refs: (
					options?: DocumentViewOptions,
				) => DocumentFieldRefsResult<TField>;
				ref: (options?: DocumentViewOptions) => DocumentFieldRefResult<TField>;
			}
		: // biome-ignore lint/complexity/noBannedTypes: x
			{};

type DocumentFieldViewGroupMethods<
	TDocument extends CollectionDocument,
	TField extends DocumentField,
> =
	TField extends GroupDocumentField<
		string,
		DocumentField["type"],
		infer TFields,
		boolean
	>
		? {
				groups: () => Array<DocumentFieldGroupView<TDocument, TFields>>;
			}
		: // biome-ignore lint/complexity/noBannedTypes: x
			{};

export type DocumentFieldView<
	TDocument extends CollectionDocument = CollectionDocument,
	TField extends DocumentField = DocumentField,
> = {
	raw: TField;
	key: TField["key"];
	type: TField["type"];
	groupRef: FieldGroupRefOf<TField>;
	withLocale: (locale: LocaleCode) => DocumentFieldView<TDocument, TField>;
} & DocumentFieldViewValueMethods<TField> &
	DocumentFieldViewRelationMethods<TField> &
	DocumentFieldViewGroupMethods<TDocument, TField>;

export type FieldAccessorMethods<
	TDocument extends CollectionDocument,
	TFields extends DocumentFieldMap,
> = {
	field: <TKey extends FieldKeyOf<TFields>>(
		key: TKey,
	) => DocumentFieldView<TDocument, TFields[TKey]>;
};

export type DocumentFieldGroupView<
	TDocument extends CollectionDocument = CollectionDocument,
	TFields extends DocumentFieldMap = DocumentFieldMap,
> = {
	raw: DocumentFieldGroup<TFields>;
	ref: string;
	order: number;
	open: boolean;
	withLocale: (
		locale: LocaleCode,
	) => DocumentFieldGroupView<TDocument, TFields>;
} & FieldAccessorMethods<TDocument, TFields>;

export type DocumentBrickView<
	TDocument extends CollectionDocument = CollectionDocument,
	TBrick extends DocumentBrick = DocumentBrick,
> = {
	raw: TBrick;
	id: TBrick["id"];
	ref: TBrick["ref"];
	key: TBrick["key"];
	order: TBrick["order"];
	open: TBrick["open"];
	type: TBrick["type"];
	withLocale: (locale: LocaleCode) => DocumentBrickView<TDocument, TBrick>;
} & FieldAccessorMethods<TDocument, TBrick["fields"]>;

export type DocumentView<
	TDocument extends CollectionDocument = CollectionDocument,
> = {
	raw: TDocument;
	id: TDocument["id"];
	collectionKey: TDocument["collectionKey"];
	withLocale: (locale: LocaleCode) => DocumentView<TDocument>;
	brick: {
		<TKey extends DocumentBrickKeyOf<TDocument>>(
			key: TKey,
		):
			| DocumentBrickView<TDocument, DocumentBrickByKey<TDocument, TKey>>
			| undefined;
		<TFilter extends DocumentBrickFilter<TDocument>>(
			filter: TFilter,
		):
			| DocumentBrickView<TDocument, DocumentBrickByFilter<TDocument, TFilter>>
			| undefined;
	};
	bricks: {
		(): Array<DocumentBrickView<TDocument, DocumentBrickItem<TDocument>>>;
		<TKey extends DocumentBrickKeyOf<TDocument>>(
			key: TKey,
		): Array<DocumentBrickView<TDocument, DocumentBrickByKey<TDocument, TKey>>>;
		<TFilter extends DocumentBrickFilter<TDocument>>(
			filter: TFilter,
		): Array<
			DocumentBrickView<TDocument, DocumentBrickByFilter<TDocument, TFilter>>
		>;
	};
} & FieldAccessorMethods<TDocument, DocumentFieldsOf<TDocument>>;

export type GroupFieldsOf<TField> = GroupFieldsOfInternal<TField>;

export type GroupFieldKeyOf<TFields extends DocumentFieldMap> = KeysMatching<
	TFields,
	AnyGroupField
>;
