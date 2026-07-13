import type {
	CollectionDocument,
	DocumentBrick,
	DocumentFieldValueMap,
	DocumentRef,
	MediaRef,
	RelationFieldValue,
	UserRef,
} from "../../types.js";
import type {
	DocumentBrickByFilter,
	DocumentBrickByKey,
	DocumentBrickFilter,
	DocumentBrickItem,
	DocumentBrickKeyOf,
	DocumentRefResult,
	DocumentRefsResult,
	DocumentRefType,
	DocumentViewOptions,
	FieldKeyOf,
} from "./types.js";

type CollectionDocumentRef = NonNullable<
	NonNullable<CollectionDocument["refs"]>[string]
>[number];

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isDocumentRef = (value: unknown): value is DocumentRef => {
	return isObjectRecord(value) && "collectionKey" in value && "id" in value;
};

const isMediaRef = (value: unknown): value is NonNullable<MediaRef> => {
	return (
		isObjectRecord(value) &&
		typeof value.id === "number" &&
		isObjectRecord(value.file) &&
		typeof value.file.url === "string"
	);
};

const isUserRef = (value: unknown): value is NonNullable<UserRef> => {
	return (
		isObjectRecord(value) &&
		"username" in value &&
		"profilePicture" in value &&
		"id" in value
	);
};

export const buildViewOptions = (
	context: DocumentViewOptions,
	options?: DocumentViewOptions,
): DocumentViewOptions => {
	return {
		locale: options?.locale ?? context.locale,
	};
};

export const readFieldValue = (
	value: unknown,
	options?: DocumentViewOptions,
): unknown => {
	if (!options?.locale) return value;
	if (!isObjectRecord(value)) return value;
	if (!(options.locale in value)) return value;

	return value[options.locale];
};

export const requireField = <
	TFields extends DocumentFieldValueMap,
	TKey extends FieldKeyOf<TFields>,
>(
	fields: TFields,
	key: TKey,
): TFields[TKey] => {
	if (!Object.hasOwn(fields, key)) {
		throw new Error(`Unable to find field "${key}".`);
	}

	return fields[key];
};

export function getFieldValue<TValue>(
	value: TValue,
	options?: DocumentViewOptions,
): unknown {
	return readFieldValue(value, options);
}

export const getFieldGroups = <TFields extends DocumentFieldValueMap>(
	value: unknown,
): TFields[] => {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is TFields => isObjectRecord(item));
};

const findRelationRef = (
	refs: CollectionDocumentRef[],
	relation: RelationFieldValue<string>,
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

const findMediaRefById = (
	refs: CollectionDocumentRef[],
	relationId: number,
): NonNullable<MediaRef> | undefined => {
	for (const ref of refs) {
		if (isMediaRef(ref) && ref.id === relationId) return ref;
	}

	return undefined;
};

const findUserRefById = (
	refs: CollectionDocumentRef[],
	relationId: number,
): NonNullable<UserRef> | undefined => {
	for (const ref of refs) {
		if (isUserRef(ref) && ref.id === relationId) return ref;
	}

	return undefined;
};

const getRelationValues = (value: unknown): unknown[] => {
	if (value === null || value === undefined) return [];
	return Array.isArray(value) ? value : [value];
};

const getRelationId = (value: unknown): unknown => {
	if (isObjectRecord(value) && "id" in value) return value.id;
	return value;
};

const findGenericRef = (
	refs: CollectionDocumentRef[],
	relationValue: unknown,
): unknown | undefined => {
	const relationId = getRelationId(relationValue);

	for (const ref of refs) {
		if (Object.is(ref, relationValue)) return ref;
		if (isObjectRecord(ref) && Object.is(ref.id, relationId)) return ref;
	}

	return undefined;
};

export const readRefs = <TRefType extends DocumentRefType>(
	document: CollectionDocument,
	refType: TRefType,
	value: unknown,
	options?: DocumentViewOptions,
): DocumentRefsResult<TRefType> => {
	const relationValue = readFieldValue(value, options);

	if (refType === "relation") {
		const relations = Array.isArray(relationValue) ? relationValue : [];
		const refs = document.refs?.relation ?? [];
		const matches: DocumentRef[] = [];

		for (const relation of relations) {
			if (!isObjectRecord(relation)) continue;
			if (typeof relation.id !== "number") continue;
			if (typeof relation.collectionKey !== "string") continue;

			const match = findRelationRef(refs, {
				id: relation.id,
				collectionKey: relation.collectionKey,
			});
			if (match) matches.push(match);
		}

		return matches as DocumentRefsResult<TRefType>;
	}

	if (refType === "media") {
		const relationIds = getRelationValues(relationValue);
		const refs = document.refs?.media ?? [];
		const matches: Array<NonNullable<MediaRef>> = [];

		for (const relationId of relationIds) {
			if (typeof relationId !== "number") continue;

			const match = findMediaRefById(refs, relationId);
			if (match) matches.push(match);
		}

		return matches as DocumentRefsResult<TRefType>;
	}

	if (refType === "user") {
		const relationIds = getRelationValues(relationValue);
		const refs = document.refs?.user ?? [];
		const matches: Array<NonNullable<UserRef>> = [];

		for (const relationId of relationIds) {
			if (typeof relationId !== "number") continue;

			const match = findUserRefById(refs, relationId);
			if (match) matches.push(match);
		}

		return matches as DocumentRefsResult<TRefType>;
	}

	const relationValues = getRelationValues(relationValue);
	const refs = document.refs?.[refType] ?? [];
	const matches: unknown[] = [];

	for (const relation of relationValues) {
		const match = findGenericRef(refs, relation);
		if (match !== undefined) matches.push(match);
	}

	return matches as DocumentRefsResult<TRefType>;
};

export const readRef = <TRefType extends DocumentRefType>(
	document: CollectionDocument,
	refType: TRefType,
	value: unknown,
	options?: DocumentViewOptions,
): DocumentRefResult<TRefType> => {
	return readRefs(
		document,
		refType,
		value,
		options,
	)[0] as DocumentRefResult<TRefType>;
};

export function getFieldRefs<TRefType extends DocumentRefType>(
	document: CollectionDocument,
	refType: TRefType,
	value: unknown,
	options?: DocumentViewOptions,
): DocumentRefsResult<TRefType> {
	return readRefs(document, refType, value, options);
}

export function getFieldRef<TRefType extends DocumentRefType>(
	document: CollectionDocument,
	refType: TRefType,
	value: unknown,
	options?: DocumentViewOptions,
): DocumentRefResult<TRefType> {
	return readRef(document, refType, value, options);
}

const getOrderedBricks = <TBrick extends DocumentBrick>(
	bricks: TBrick[],
): TBrick[] => {
	if (bricks.length < 2) return bricks.slice();

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
	const bricks = getOrderedBricks(document.bricks ?? []);
	const filter = normalizeBrickFilter(filterOrKey);

	return bricks.find((brick) => matchesBrickFilter(brick, filter));
}
