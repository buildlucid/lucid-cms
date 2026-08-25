import type {
	CollectionDocument,
	DocumentBrick,
	DocumentFieldValueMap,
	DocumentRef,
	MediaRef,
	RefResource,
	RefResourceMap,
	Refs,
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
	DocumentViewOptions,
	FieldKeyOf,
} from "./types.js";

type CollectionDocumentRef = RefResourceMap[RefResource];

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
		typeof value.url === "string"
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
		preview: options?.preview ?? context.preview,
		refs: options?.refs ?? context.refs,
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

export const getFieldGroups = <TFields extends DocumentFieldValueMap>(
	value: unknown,
): TFields[] => {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is TFields => isObjectRecord(item));
};

const findDocumentRef = (
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

export function readRefs<TResource extends RefResource>(
	refsRegistry: Refs | undefined,
	resource: TResource,
	value: unknown,
	options?: DocumentViewOptions,
): DocumentRefsResult<TResource>;
export function readRefs(
	refsRegistry: Refs | undefined,
	resource: RefResource,
	value: unknown,
	options?: DocumentViewOptions,
): CollectionDocumentRef[] {
	const relationValue = readFieldValue(value, options);

	if (resource === "documents") {
		const relations = Array.isArray(relationValue) ? relationValue : [];
		const refs = refsRegistry?.documents ?? [];
		const matches: DocumentRef[] = [];

		for (const relation of relations) {
			if (!isObjectRecord(relation)) continue;
			if (typeof relation.id !== "number") continue;
			if (typeof relation.collectionKey !== "string") continue;

			const match = findDocumentRef(refs, {
				id: relation.id,
				collectionKey: relation.collectionKey,
			});
			if (match) matches.push(match);
		}

		return matches;
	}

	if (resource === "media") {
		const relationIds = getRelationValues(relationValue);
		const refs = refsRegistry?.media ?? [];
		const matches: Array<NonNullable<MediaRef>> = [];

		for (const relationId of relationIds) {
			if (typeof relationId !== "number") continue;

			const match = findMediaRefById(refs, relationId);
			if (match) matches.push(match);
		}

		return matches;
	}

	const relationValues = getRelationValues(relationValue);
	const refs = refsRegistry?.users ?? [];
	const matches: Array<NonNullable<UserRef>> = [];

	for (const relationId of relationValues) {
		if (typeof relationId !== "number") continue;

		const match = findUserRefById(refs, relationId);
		if (match) matches.push(match);
	}

	return matches;
}

export function readRef<TResource extends RefResource>(
	refsRegistry: Refs | undefined,
	resource: TResource,
	value: unknown,
	options?: DocumentViewOptions,
): DocumentRefResult<TResource>;
export function readRef(
	refsRegistry: Refs | undefined,
	resource: RefResource,
	value: unknown,
	options?: DocumentViewOptions,
): CollectionDocumentRef | undefined {
	return readRefs(refsRegistry, resource, value, options)[0];
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
