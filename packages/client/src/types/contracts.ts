export type FilterValue = string | string[] | number | number[] | null;

export type FilterOperator = string;

export type FilterObject = {
	value: FilterValue;
	operator?: FilterOperator;
};

export type SortValue = "asc" | "desc";

export type QueryFilters = Record<string, FilterObject>;

export type DocumentsGetSingleQuery = {
	filter?: QueryFilters;
	include?: Array<"bricks">;
};

export type DocumentsGetMultipleQuery = {
	filter?: QueryFilters;
	sort?: Array<{
		key: "createdAt" | "updatedAt";
		value: SortValue;
	}>;
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
