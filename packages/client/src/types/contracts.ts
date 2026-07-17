export type FilterValue =
	| string
	| string[]
	| number
	| number[]
	| boolean
	| boolean[]
	| null;

export type FilterOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "in"
	| "not-in"
	| "is"
	| "is-not"
	| "contains"
	| "not-contains"
	| "starts-with"
	| "not-starts-with"
	| "ends-with"
	| "not-ends-with";

export type FilterObject = {
	value: FilterValue;
	operator?: FilterOperator;
};

export type SortDirection = "asc" | "desc";
export type DefaultCollectionDocumentSortKey =
	| "createdAt"
	| "updatedAt"
	| "order"
	| `_${string}`;

export type QueryFilters = {
	[key: string]: FilterObject | QueryFilters | undefined;
};

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentFiltersByCollection {}

type CollectionDocumentFilterCollectionKey = Extract<
	keyof CollectionDocumentFiltersByCollection,
	string
>;

export type CollectionDocumentFilters<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentFilterCollectionKey
		? CollectionDocumentFiltersByCollection[TCollectionKey]
		: QueryFilters;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentSortsByCollection {}

type CollectionDocumentSortCollectionKey = Extract<
	keyof CollectionDocumentSortsByCollection,
	string
>;

export type CollectionDocumentSortKey<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentSortCollectionKey
		? CollectionDocumentSortsByCollection[TCollectionKey]
		: DefaultCollectionDocumentSortKey;

export type CollectionDocumentSorts<TCollectionKey extends string = string> =
	Array<{
		key: CollectionDocumentSortKey<TCollectionKey>;
		direction: SortDirection;
	}>;

export type DefaultCollectionDocumentVersion = "latest" | "revision" | string;
export type DefaultCollectionDocumentVersionKey = string;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionsByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionKeysByCollection {}

type CollectionDocumentVersionCollectionKey = Extract<
	keyof CollectionDocumentVersionsByCollection,
	string
>;

type CollectionDocumentVersionKeyCollectionKey = Extract<
	keyof CollectionDocumentVersionKeysByCollection,
	string
>;

export type CollectionDocumentVersion<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentVersionCollectionKey
		? CollectionDocumentVersionsByCollection[TCollectionKey]
		: DefaultCollectionDocumentVersion;

export type CollectionDocumentVersionKey<
	TCollectionKey extends string = string,
> = TCollectionKey extends CollectionDocumentVersionKeyCollectionKey
	? CollectionDocumentVersionKeysByCollection[TCollectionKey]
	: DefaultCollectionDocumentVersionKey;

export type DocumentRefInclude = "refs" | `refs.${string}`;
export type DocumentSingleInclude = "bricks" | "meta" | DocumentRefInclude;
export type DocumentMultipleInclude = "meta" | DocumentRefInclude;

export type DocumentsGetSingleQuery<TCollectionKey extends string = string> = {
	filter?: CollectionDocumentFilters<TCollectionKey>;
	include?: DocumentSingleInclude[];
};

export type DocumentsGetMultipleQuery<TCollectionKey extends string = string> =
	{
		filter?: CollectionDocumentFilters<TCollectionKey>;
		sort?: CollectionDocumentSorts<TCollectionKey>;
		include?: DocumentMultipleInclude[];
		page?: number;
		perPage?: number;
	};

export type MediaGetMultipleQuery = {
	filter?: Partial<
		Record<
			| "title"
			| "key"
			| "mimeType"
			| "folderId"
			| "type"
			| "extension"
			| "isDeleted"
			| "deletedBy"
			| "public"
			| "origin",
			FilterObject
		>
	>;
	sort?: Array<{
		key:
			| "createdAt"
			| "updatedAt"
			| "title"
			| "fileSize"
			| "width"
			| "height"
			| "mimeType"
			| "extension"
			| "deletedBy"
			| "isDeletedAt";
		direction: SortDirection;
	}>;
	page?: number;
	perPage?: number;
};
