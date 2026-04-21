export type FilterValue = string | string[] | number | number[] | null;

export type FilterOperator = string;

export type FilterObject = {
	value: FilterValue;
	operator?: FilterOperator;
};

export type SortValue = "asc" | "desc";
export type DefaultCollectionDocumentSortKey = "createdAt" | "updatedAt";

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
		value: SortValue;
	}>;

export type DefaultCollectionDocumentStatus = "latest" | "revision" | string;
export type DefaultCollectionDocumentVersionKey = string;

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentStatusesByCollection {}

// biome-ignore lint/suspicious/noEmptyInterface: generated types merge into this interface via module augmentation.
export interface CollectionDocumentVersionKeysByCollection {}

type CollectionDocumentStatusCollectionKey = Extract<
	keyof CollectionDocumentStatusesByCollection,
	string
>;

type CollectionDocumentVersionKeyCollectionKey = Extract<
	keyof CollectionDocumentVersionKeysByCollection,
	string
>;

export type CollectionDocumentStatus<TCollectionKey extends string = string> =
	TCollectionKey extends CollectionDocumentStatusCollectionKey
		? CollectionDocumentStatusesByCollection[TCollectionKey]
		: DefaultCollectionDocumentStatus;

export type CollectionDocumentVersionKey<
	TCollectionKey extends string = string,
> = TCollectionKey extends CollectionDocumentVersionKeyCollectionKey
	? CollectionDocumentVersionKeysByCollection[TCollectionKey]
	: DefaultCollectionDocumentVersionKey;

export type DocumentsGetSingleQuery<TCollectionKey extends string = string> = {
	filter?: CollectionDocumentFilters<TCollectionKey>;
	include?: Array<"bricks">;
};

export type DocumentsGetMultipleQuery<TCollectionKey extends string = string> =
	{
		filter?: CollectionDocumentFilters<TCollectionKey>;
		sort?: CollectionDocumentSorts<TCollectionKey>;
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
			| "public",
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
		value: SortValue;
	}>;
	page?: number;
	perPage?: number;
};
