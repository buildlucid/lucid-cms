import type {
	CollectionDocument,
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
import type {
	DocumentBrickByFilter,
	DocumentBrickByKey,
	DocumentBrickFilter,
	DocumentBrickItem,
	DocumentBrickKeyOf,
	DocumentRelationField,
	DocumentViewOptions,
	FieldKeyOf,
	LocaleCode,
	MediaRelationField,
	UserRelationField,
} from "./types.js";

type CollectionDocumentRef = NonNullable<
	NonNullable<CollectionDocument["refs"]>[string]
>[number];

/**
 * Keeps relation matching safe by confirming an unknown ref has the document-ref
 * shape before reading its identifiers.
 */
const isDocumentRef = (value: unknown): value is DocumentRef => {
	return (
		value !== null &&
		value !== undefined &&
		typeof value === "object" &&
		"collectionKey" in value &&
		"id" in value
	);
};

/**
 * Narrows unknown relation ref values to concrete media refs before matching ids.
 */
const isMediaRef = (value: unknown): value is NonNullable<MediaRef> => {
	return (
		value !== null &&
		value !== undefined &&
		typeof value === "object" &&
		"url" in value &&
		"id" in value
	);
};

/**
 * Narrows unknown relation ref values to concrete user refs before matching ids.
 */
const isUserRef = (value: unknown): value is NonNullable<UserRef> => {
	return (
		value !== null &&
		value !== undefined &&
		typeof value === "object" &&
		"username" in value &&
		"id" in value
	);
};

/**
 * Splits document relation fields from other field types so ref resolution can
 * use the correct relation value shape.
 */
const isDocumentRelationField = (
	field: DocumentField,
): field is DocumentRelationField => {
	return field.type === "document";
};

/**
 * Splits media relation fields from other field types so ref resolution can
 * use media ids directly.
 */
const isMediaRelationField = (
	field: DocumentField,
): field is MediaRelationField => {
	return field.type === "media";
};

/**
 * Splits user relation fields from other field types so ref resolution can use
 * user ids directly.
 */
const isUserRelationField = (
	field: DocumentField,
): field is UserRelationField => {
	return field.type === "user";
};

/**
 * Merges per-call options with the wrapper context so nested helpers inherit the
 * current locale unless a call overrides it.
 */
export const buildViewOptions = (
	context: DocumentViewOptions,
	options?: DocumentViewOptions,
): DocumentViewOptions => {
	return {
		locale: options?.locale ?? context.locale,
	};
};

/**
 * Centralizes locale validation so translated fields fail with a clear error
 * when callers forget to provide one.
 */
const requireLocaleForField = (
	field: DocumentField,
	options?: DocumentViewOptions,
): LocaleCode | undefined => {
	if (!field.translations) {
		return options?.locale;
	}

	const locale = options?.locale;
	if (!locale) {
		throw new Error(
			`A locale is required to read translated field "${field.key}".`,
		);
	}

	return locale;
};

/**
 * Reads a field's raw value, applying locale selection for translated fields.
 */
export const readFieldValue = (
	field: DocumentField,
	options?: DocumentViewOptions,
): unknown => {
	if (field.translations) {
		const locale = requireLocaleForField(field, options);
		return locale ? field.translations[locale] : undefined;
	}

	return field.value;
};

/**
 * Gives wrapper helpers a single place to enforce that requested field keys
 * exist before building field views around them.
 */
export const requireField = <
	TFields extends DocumentFieldMap,
	TKey extends FieldKeyOf<TFields>,
>(
	fields: TFields,
	key: TKey,
): TFields[TKey] => {
	const field = fields[key];
	if (!field) {
		throw new Error(`Unable to find field "${key}".`);
	}

	return field;
};

/** Returns a field value, with locale support for translated fields. */
export function getFieldValue<
	TKey extends string,
	TType extends DocumentField["type"],
	TValue,
	THasGroupRef extends boolean,
>(
	field: ValueDocumentField<TKey, TType, TValue, THasGroupRef>,
	options?: DocumentViewOptions,
): TValue;
export function getFieldValue<
	TKey extends string,
	TType extends DocumentField["type"],
	TValue,
	THasGroupRef extends boolean,
>(
	field: TranslatedDocumentField<TKey, TType, TValue, THasGroupRef>,
	options: DocumentViewOptions & { locale: LocaleCode },
): TValue | undefined;
export function getFieldValue(
	field: DocumentField,
	options?: DocumentViewOptions,
): unknown {
	return readFieldValue(field, options);
}

/** Returns the repeater groups for a group field. */
export function getFieldGroups<TFields extends DocumentFieldMap>(
	field: GroupDocumentField<string, DocumentField["type"], TFields, boolean>,
): Array<DocumentFieldGroup<TFields>>;
export function getFieldGroups(
	field: DocumentField,
): Array<DocumentFieldGroup<DocumentFieldMap>>;
export function getFieldGroups(
	field: DocumentField,
): Array<DocumentFieldGroup<DocumentFieldMap>> {
	return (
		(field.groups as Array<DocumentFieldGroup<DocumentFieldMap>> | undefined) ??
		[]
	);
}

/**
 * Looks up a hydrated document ref for a stored document relation value while
 * preserving runtime safety around mixed ref arrays.
 */
const findDocumentRelationRef = (
	refs: CollectionDocumentRef[],
	relation: DocumentRelationValue<string>,
): DocumentRef | undefined => {
	for (const ref of refs) {
		if (
			isDocumentRef(ref) &&
			ref.id === relation.id &&
			ref.collectionKey === relation.collectionKey
		) {
			return ref;
		}
	}

	return undefined;
};

/**
 * Looks up a hydrated media ref for a stored media id.
 */
const findMediaRefById = (
	refs: CollectionDocumentRef[],
	relationId: number,
): NonNullable<MediaRef> | undefined => {
	for (const ref of refs) {
		if (isMediaRef(ref) && ref.id === relationId) {
			return ref;
		}
	}

	return undefined;
};

/**
 * Looks up a hydrated user ref for a stored user id.
 */
const findUserRefById = (
	refs: CollectionDocumentRef[],
	relationId: number,
): NonNullable<UserRef> | undefined => {
	for (const ref of refs) {
		if (isUserRef(ref) && ref.id === relationId) {
			return ref;
		}
	}

	return undefined;
};

/**
 * Avoids re-sorting already ordered bricks while still guaranteeing callers get
 * a stable order-sorted result.
 */
const getOrderedBricks = <TBrick extends DocumentBrick>(
	bricks: TBrick[],
): TBrick[] => {
	if (bricks.length < 2) {
		return bricks.slice();
	}

	for (let index = 1; index < bricks.length; index += 1) {
		const previousBrick = bricks[index - 1];
		const currentBrick = bricks[index];
		if (!previousBrick || !currentBrick) continue;

		if (previousBrick.order > currentBrick.order) {
			return [...bricks].sort((a, b) => a.order - b.order);
		}
	}

	return bricks.slice();
};

/**
 * Resolves every hydrated ref for a relation field, keeping the same order as
 * the stored relation values.
 */
export const readFieldRefs = (
	document: CollectionDocument,
	field: DocumentField,
	options?: DocumentViewOptions,
): Array<DocumentRef | NonNullable<MediaRef> | NonNullable<UserRef>> => {
	if (isDocumentRelationField(field)) {
		const relations = readFieldValue(field, options) as
			| Array<DocumentRelationValue<string>>
			| undefined;
		const refs = document.refs?.document ?? [];
		if (!relations?.length || !refs.length) return [];

		const matches: DocumentRef[] = [];
		for (const relation of relations) {
			const match = findDocumentRelationRef(refs, relation);
			if (match) matches.push(match);
		}

		return matches;
	}

	if (isMediaRelationField(field)) {
		const relationIds = readFieldValue(field, options) as number[] | undefined;
		const refs = document.refs?.media ?? [];
		if (!relationIds?.length || !refs.length) return [];

		const matches: Array<NonNullable<MediaRef>> = [];
		for (const relationId of relationIds) {
			const match = findMediaRefById(refs, relationId);
			if (match) matches.push(match);
		}

		return matches;
	}

	if (isUserRelationField(field)) {
		const relationIds = readFieldValue(field, options) as number[] | undefined;
		const refs = document.refs?.user ?? [];
		if (!relationIds?.length || !refs.length) return [];

		const matches: Array<NonNullable<UserRef>> = [];
		for (const relationId of relationIds) {
			const match = findUserRefById(refs, relationId);
			if (match) matches.push(match);
		}

		return matches;
	}

	return [];
};

/**
 * Resolves only the first hydrated ref for a relation field so single-ref
 * access does not need to build the full matched ref array first.
 */
export const readFieldRef = (
	document: CollectionDocument,
	field: DocumentField,
	options?: DocumentViewOptions,
): DocumentRef | NonNullable<MediaRef> | NonNullable<UserRef> | undefined => {
	if (isDocumentRelationField(field)) {
		const relation = (
			readFieldValue(field, options) as
				| Array<DocumentRelationValue<string>>
				| undefined
		)?.[0];
		if (!relation) return undefined;
		return findDocumentRelationRef(document.refs?.document ?? [], relation);
	}

	if (isMediaRelationField(field)) {
		const relationId = (
			readFieldValue(field, options) as number[] | undefined
		)?.[0];
		if (relationId === undefined) return undefined;
		return findMediaRefById(document.refs?.media ?? [], relationId);
	}

	if (isUserRelationField(field)) {
		const relationId = (
			readFieldValue(field, options) as number[] | undefined
		)?.[0];
		if (relationId === undefined) return undefined;
		return findUserRefById(document.refs?.user ?? [], relationId);
	}

	return undefined;
};

/** Returns all hydrated refs for a relation field. */
export function getFieldRefs<
	TKey extends string,
	TCollectionKey extends string,
	THasGroupRef extends boolean,
>(
	document: CollectionDocument,
	field: DocumentRelationField<TKey, TCollectionKey, THasGroupRef>,
	options?: DocumentViewOptions,
): Array<DocumentRef<TCollectionKey>>;
export function getFieldRefs<TKey extends string, THasGroupRef extends boolean>(
	document: CollectionDocument,
	field: MediaRelationField<TKey, THasGroupRef>,
	options?: DocumentViewOptions,
): Array<NonNullable<MediaRef>>;
export function getFieldRefs<TKey extends string, THasGroupRef extends boolean>(
	document: CollectionDocument,
	field: UserRelationField<TKey, THasGroupRef>,
	options?: DocumentViewOptions,
): Array<NonNullable<UserRef>>;
export function getFieldRefs(
	document: CollectionDocument,
	field: DocumentField,
	options?: DocumentViewOptions,
): Array<DocumentRef | NonNullable<MediaRef> | NonNullable<UserRef>> {
	return readFieldRefs(document, field, options);
}

/** Returns the first hydrated ref for a relation field. */
export function getFieldRef<
	TKey extends string,
	TCollectionKey extends string,
	THasGroupRef extends boolean,
>(
	document: CollectionDocument,
	field: DocumentRelationField<TKey, TCollectionKey, THasGroupRef>,
	options?: DocumentViewOptions,
): DocumentRef<TCollectionKey> | undefined;
export function getFieldRef<TKey extends string, THasGroupRef extends boolean>(
	document: CollectionDocument,
	field: MediaRelationField<TKey, THasGroupRef>,
	options?: DocumentViewOptions,
): NonNullable<MediaRef> | undefined;
export function getFieldRef<TKey extends string, THasGroupRef extends boolean>(
	document: CollectionDocument,
	field: UserRelationField<TKey, THasGroupRef>,
	options?: DocumentViewOptions,
): NonNullable<UserRef> | undefined;
export function getFieldRef(
	document: CollectionDocument,
	field: DocumentField,
	options?: DocumentViewOptions,
): DocumentRef | NonNullable<MediaRef> | NonNullable<UserRef> | undefined {
	return readFieldRef(document, field, options);
}

/**
 * Normalizes the brick helper inputs so string keys and object filters can
 * share the same matching path.
 */
const normalizeBrickFilter = (
	filterOrKey?: string | DocumentBrickFilter,
): {
	key?: string;
	type?: string;
} => {
	if (typeof filterOrKey === "string") {
		return {
			key: filterOrKey,
		};
	}

	return filterOrKey ?? {};
};

/**
 * Keeps the brick filtering logic in one place for both single and multiple
 * brick selectors.
 */
const matchesBrickFilter = (
	brick: DocumentBrick,
	filter: {
		key?: string;
		type?: string;
	},
): boolean => {
	if (filter.key && brick.key !== filter.key) return false;
	if (filter.type && brick.type !== filter.type) return false;
	return true;
};

/** Returns document bricks, optionally filtered by key or type. */
export function getBricks<TDocument extends CollectionDocument>(
	document: TDocument,
): Array<DocumentBrickItem<TDocument>>;
export function getBricks<
	TDocument extends CollectionDocument,
	TKey extends DocumentBrickKeyOf<TDocument>,
>(document: TDocument, key: TKey): Array<DocumentBrickByKey<TDocument, TKey>>;
export function getBricks<
	TDocument extends CollectionDocument,
	TFilter extends DocumentBrickFilter<TDocument>,
>(
	document: TDocument,
	filter: TFilter,
): Array<DocumentBrickByFilter<TDocument, TFilter>>;
export function getBricks(
	document: CollectionDocument,
	filterOrKey?: string | DocumentBrickFilter,
): DocumentBrick[] {
	const bricks = getOrderedBricks(document.bricks ?? []);
	const filter = normalizeBrickFilter(filterOrKey);

	if (!filter.key && !filter.type) return bricks;
	return bricks.filter((brick) => matchesBrickFilter(brick, filter));
}

/** Returns the first brick that matches a key or brick filter. */
export function getBrick<
	TDocument extends CollectionDocument,
	TKey extends DocumentBrickKeyOf<TDocument>,
>(
	document: TDocument,
	key: TKey,
): DocumentBrickByKey<TDocument, TKey> | undefined;
export function getBrick<
	TDocument extends CollectionDocument,
	TFilter extends DocumentBrickFilter<TDocument>,
>(
	document: TDocument,
	filter: TFilter,
): DocumentBrickByFilter<TDocument, TFilter> | undefined;
export function getBrick(
	document: CollectionDocument,
	filterOrKey: string | DocumentBrickFilter,
): DocumentBrick | undefined {
	if (typeof filterOrKey === "string") {
		return getBricks(document, filterOrKey)[0];
	}

	return getBricks(document, filterOrKey)[0];
}
