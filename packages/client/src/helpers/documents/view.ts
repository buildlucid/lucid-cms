import type {
	CollectionDocument,
	DocumentBrick,
	DocumentFieldValueMap,
} from "../../types.js";
import {
	buildViewOptions,
	getBrick,
	getBricks,
	getFieldGroups,
	readFieldValue,
	readRef,
	readRefs,
	requireField,
} from "./helpers.js";
import type {
	DocumentBrickFilter,
	DocumentBrickItem,
	DocumentBrickKeyOf,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentFieldView,
	DocumentRefType,
	DocumentRefValue,
	DocumentView,
	DocumentViewOptions,
	DocumentViewOptionsWithLocale,
	FieldAccessorMethods,
	FieldKeyOf,
	GroupFieldsOf,
	LocaleCode,
} from "./types.js";

const createFieldView = <
	TDocument extends CollectionDocument,
	TValue,
	THasLocale extends boolean,
>(props: {
	document: TDocument;
	key: string;
	value: TValue;
	context: DocumentViewOptions;
}): DocumentFieldView<TDocument, TValue, THasLocale> => {
	return {
		raw: props.value,
		key: props.key,
		withLocale: (locale: LocaleCode) =>
			createFieldView({
				document: props.document,
				key: props.key,
				value: props.value,
				context: {
					locale,
				},
			}) as DocumentFieldView<TDocument, TValue, true>,
		value: (options?: DocumentViewOptions) =>
			readFieldValue(
				props.value,
				buildViewOptions(props.context, options),
			) as ReturnType<
				DocumentFieldView<TDocument, TValue, THasLocale>["value"]
			>,
		refs: <TRefType extends DocumentRefType>(
			refType: TRefType,
			options?: DocumentViewOptions,
		) =>
			readRefs(
				props.document,
				refType,
				props.value,
				buildViewOptions(props.context, options),
			),
		ref: <TRefType extends DocumentRefType>(
			refType: TRefType,
			options?: DocumentViewOptions,
		) =>
			readRef(
				props.document,
				refType,
				props.value,
				buildViewOptions(props.context, options),
			),
		groups: () =>
			getFieldGroups<GroupFieldsOf<TValue>>(props.value).map((group) =>
				createFieldGroupView<TDocument, GroupFieldsOf<TValue>, THasLocale>({
					document: props.document,
					group,
					context: props.context,
				}),
			),
	} as DocumentFieldView<TDocument, TValue, THasLocale>;
};

const createFieldAccessorMethods = <
	TDocument extends CollectionDocument,
	TFields extends DocumentFieldValueMap,
	THasLocale extends boolean,
>(props: {
	document: TDocument;
	fields: TFields;
	context: DocumentViewOptions;
}): FieldAccessorMethods<TDocument, TFields, THasLocale> => {
	const field = <TKey extends FieldKeyOf<TFields>>(
		key: TKey,
	): DocumentFieldView<TDocument, TFields[TKey], THasLocale> => {
		const value = requireField(props.fields, key);

		return createFieldView<TDocument, TFields[TKey], THasLocale>({
			document: props.document,
			key,
			value,
			context: props.context,
		});
	};

	return {
		field,
	};
};

const createFieldGroupView = <
	TDocument extends CollectionDocument,
	TFields extends DocumentFieldValueMap,
	THasLocale extends boolean,
>(props: {
	document: TDocument;
	group: TFields;
	context: DocumentViewOptions;
}): DocumentFieldGroupView<TDocument, TFields, THasLocale> => {
	return {
		raw: props.group,
		withLocale: (locale: LocaleCode) =>
			createFieldGroupView<TDocument, TFields, true>({
				document: props.document,
				group: props.group,
				context: {
					locale,
				},
			}) as DocumentFieldGroupView<TDocument, TFields, true>,
		...createFieldAccessorMethods<TDocument, TFields, THasLocale>({
			document: props.document,
			fields: props.group,
			context: props.context,
		}),
	};
};

const createBrickView = <
	TDocument extends CollectionDocument,
	TBrick extends DocumentBrick,
	THasLocale extends boolean,
>(props: {
	document: TDocument;
	brick: TBrick;
	context: DocumentViewOptions;
}): DocumentBrickView<TDocument, TBrick, THasLocale> => {
	return {
		raw: props.brick,
		id: props.brick.id,
		ref: props.brick.ref,
		key: props.brick.key,
		order: props.brick.order,
		type: props.brick.type,
		withLocale: (locale: LocaleCode) =>
			createBrickView<TDocument, TBrick, true>({
				document: props.document,
				brick: props.brick,
				context: {
					locale,
				},
			}) as DocumentBrickView<TDocument, TBrick, true>,
		...createFieldAccessorMethods<TDocument, TBrick["fields"], THasLocale>({
			document: props.document,
			fields: props.brick.fields,
			context: props.context,
		}),
	} as unknown as DocumentBrickView<TDocument, TBrick, THasLocale>;
};

/** Wraps a document and reads translated fields using the supplied locale. */
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument,
	options: DocumentViewOptionsWithLocale,
): DocumentView<TDocument, true>;
/** Wraps a document with typed helpers for fields, bricks, refs, and locales. */
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument,
	options?: DocumentViewOptions,
): DocumentView<TDocument, false>;
/** Returns undefined when the document is null or undefined. */
export function asDocument(
	document: null | undefined,
	options?: DocumentViewOptions,
): undefined;
/** Wraps an optional document and reads translated fields using the supplied locale. */
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument | null | undefined,
	options: DocumentViewOptionsWithLocale,
): DocumentView<TDocument, true> | undefined;
/** Wraps an optional document with typed helpers when it is present. */
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument | null | undefined,
	options?: DocumentViewOptions,
): DocumentView<TDocument, false> | undefined;
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument | null | undefined,
	options: DocumentViewOptions = {},
): DocumentView<TDocument, boolean> | undefined {
	if (!document) return undefined;

	const brick = ((
		filterOrKey: DocumentBrickKeyOf<TDocument> | DocumentBrickFilter<TDocument>,
	) => {
		const matchedBrick =
			typeof filterOrKey === "string"
				? getBrick(document, filterOrKey)
				: getBrick(document, filterOrKey);

		if (!matchedBrick) return undefined;

		return createBrickView<TDocument, DocumentBrickItem<TDocument>, boolean>({
			document,
			brick: matchedBrick as DocumentBrickItem<TDocument>,
			context: options,
		});
	}) as DocumentView<TDocument, boolean>["brick"];

	const bricks = ((
		filterOrKey?:
			| DocumentBrickKeyOf<TDocument>
			| DocumentBrickFilter<TDocument>,
	) => {
		const matchedBricks =
			typeof filterOrKey === "string"
				? getBricks(document, filterOrKey)
				: filterOrKey
					? getBricks(document, filterOrKey)
					: getBricks(document);

		return matchedBricks.map((matchedBrick) =>
			createBrickView<TDocument, DocumentBrickItem<TDocument>, boolean>({
				document,
				brick: matchedBrick as DocumentBrickItem<TDocument>,
				context: options,
			}),
		);
	}) as DocumentView<TDocument, boolean>["bricks"];

	return {
		raw: document,
		id: document.id,
		collectionKey: document.collectionKey,
		withLocale: (locale: LocaleCode) =>
			asDocument(document, {
				locale,
			}) as DocumentView<TDocument, true>,
		brick,
		bricks,
		refs: <TRefType extends DocumentRefType>(
			refType: TRefType,
			value: DocumentRefValue<TRefType>,
		) => readRefs(document, refType, value),
		ref: <TRefType extends DocumentRefType>(
			refType: TRefType,
			value: DocumentRefValue<TRefType>,
		) => readRef(document, refType, value),
		...createFieldAccessorMethods<TDocument, TDocument["fields"], boolean>({
			document,
			fields: document.fields,
			context: options,
		}),
	} as unknown as DocumentView<TDocument, boolean>;
}
