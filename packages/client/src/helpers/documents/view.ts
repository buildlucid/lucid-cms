import type {
	CollectionDocument,
	DocumentBrick,
	DocumentField,
	DocumentFieldGroup,
	DocumentFieldMap,
} from "../../types.js";
import {
	buildViewOptions,
	getBrick,
	getBricks,
	getFieldGroups,
	readFieldRef,
	readFieldRefs,
	readFieldValue,
	requireField,
} from "./helpers.js";
import type {
	DocumentBrickFilter,
	DocumentBrickItem,
	DocumentBrickKeyOf,
	DocumentBrickView,
	DocumentFieldGroupView,
	DocumentFieldRefResult,
	DocumentFieldRefsResult,
	DocumentFieldValueResult,
	DocumentFieldView,
	DocumentView,
	DocumentViewOptions,
	FieldAccessorMethods,
	FieldGroupRefOf,
	FieldKeyOf,
	GroupFieldsOf,
	LocaleCode,
} from "./types.js";

/**
 * Builds a field-scoped view so callers can read values, refs, and repeater
 * groups without repeatedly passing the parent document and locale context.
 */
const createFieldView = <
	TDocument extends CollectionDocument,
	TField extends DocumentField,
>(props: {
	document: TDocument;
	field: TField;
	context: DocumentViewOptions;
}): DocumentFieldView<TDocument, TField> => {
	return {
		raw: props.field,
		key: props.field.key,
		type: props.field.type,
		groupRef: props.field.groupRef as FieldGroupRefOf<TField>,
		withLocale: (locale: LocaleCode) =>
			createFieldView({
				document: props.document,
				field: props.field,
				context: {
					locale,
				},
			}),
		value: (options?: DocumentViewOptions) =>
			readFieldValue(
				props.field as DocumentField,
				buildViewOptions(props.context, options),
			) as DocumentFieldValueResult<TField>,
		refs: (options?: DocumentViewOptions) =>
			readFieldRefs(
				props.document,
				props.field as DocumentField,
				buildViewOptions(props.context, options),
			) as DocumentFieldRefsResult<TField>,
		ref: (options?: DocumentViewOptions) =>
			readFieldRef(
				props.document,
				props.field as DocumentField,
				buildViewOptions(props.context, options),
			) as DocumentFieldRefResult<TField>,
		groups: () =>
			getFieldGroups(props.field).map((group) =>
				createFieldGroupView({
					document: props.document,
					group,
					context: props.context,
				}),
			) as unknown as Array<
				DocumentFieldGroupView<TDocument, GroupFieldsOf<TField>>
			>,
	} as unknown as DocumentFieldView<TDocument, TField>;
};

/**
 * Reuses the same field accessor shape across documents, bricks, and repeater
 * groups so navigation stays consistent everywhere.
 */
const createFieldAccessorMethods = <
	TDocument extends CollectionDocument,
	TFields extends DocumentFieldMap,
>(props: {
	document: TDocument;
	fields: TFields;
	context: DocumentViewOptions;
}): FieldAccessorMethods<TDocument, TFields> => {
	const field = <TKey extends FieldKeyOf<TFields>>(
		key: TKey,
	): DocumentFieldView<TDocument, TFields[TKey]> => {
		return createFieldView({
			document: props.document,
			field: requireField(props.fields, key),
			context: props.context,
		}) as unknown as DocumentFieldView<TDocument, TFields[TKey]>;
	};

	return {
		field,
	};
};

/**
 * Wraps a repeater group in the same helper surface as the root document so
 * nested content can be read with the same mental model.
 */
const createFieldGroupView = <
	TDocument extends CollectionDocument,
	TFields extends DocumentFieldMap,
>(props: {
	document: TDocument;
	group: DocumentFieldGroup<TFields>;
	context: DocumentViewOptions;
}): DocumentFieldGroupView<TDocument, TFields> => {
	return {
		raw: props.group,
		ref: props.group.ref,
		order: props.group.order,
		open: props.group.open,
		withLocale: (locale: LocaleCode) =>
			createFieldGroupView({
				document: props.document,
				group: props.group,
				context: {
					locale,
				},
			}),
		...createFieldAccessorMethods({
			document: props.document,
			fields: props.group.fields,
			context: props.context,
		}),
	} as unknown as DocumentFieldGroupView<TDocument, TFields>;
};

/**
 * Wraps a brick with field helpers while preserving the brick's own metadata
 * like key, type, and order for rendering decisions.
 */
const createBrickView = <
	TDocument extends CollectionDocument,
	TBrick extends DocumentBrick,
>(props: {
	document: TDocument;
	brick: TBrick;
	context: DocumentViewOptions;
}): DocumentBrickView<TDocument, TBrick> => {
	return {
		raw: props.brick,
		id: props.brick.id,
		ref: props.brick.ref,
		key: props.brick.key,
		order: props.brick.order,
		open: props.brick.open,
		type: props.brick.type,
		withLocale: (locale: LocaleCode) =>
			createBrickView({
				document: props.document,
				brick: props.brick,
				context: {
					locale,
				},
			}),
		...createFieldAccessorMethods({
			document: props.document,
			fields: props.brick.fields,
			context: props.context,
		}),
	} as unknown as DocumentBrickView<TDocument, TBrick>;
};

/** Wraps a document with helpers for fields, refs, groups, and bricks. */
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument,
	options?: DocumentViewOptions,
): DocumentView<TDocument>;
/** Returns `undefined` when the input document is nullish. */
export function asDocument(
	document: null | undefined,
	options?: DocumentViewOptions,
): undefined;
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument | null | undefined,
	options?: DocumentViewOptions,
): DocumentView<TDocument> | undefined;
export function asDocument<TDocument extends CollectionDocument>(
	document: TDocument | null | undefined,
	options: DocumentViewOptions = {},
): DocumentView<TDocument> | undefined {
	if (!document) {
		return undefined;
	}

	const brick = ((
		filterOrKey: DocumentBrickKeyOf<TDocument> | DocumentBrickFilter<TDocument>,
	) => {
		const matchedBrick =
			typeof filterOrKey === "string"
				? getBrick(document, filterOrKey)
				: getBrick(document, filterOrKey);

		if (!matchedBrick) return undefined;

		return createBrickView({
			document,
			brick: matchedBrick as DocumentBrickItem<TDocument>,
			context: options,
		});
	}) as DocumentView<TDocument>["brick"];

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
			createBrickView({
				document,
				brick: matchedBrick as DocumentBrickItem<TDocument>,
				context: options,
			}),
		);
	}) as unknown as DocumentView<TDocument>["bricks"];

	return {
		raw: document,
		id: document.id,
		collectionKey: document.collectionKey,
		withLocale: (locale: LocaleCode) =>
			asDocument(document, {
				locale,
			}),
		brick,
		bricks,
		...createFieldAccessorMethods({
			document,
			fields: document.fields,
			context: options,
		}),
	} as unknown as DocumentView<TDocument>;
}
