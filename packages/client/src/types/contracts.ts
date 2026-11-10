import type { FilterCondition, SortDirection } from "@lucidcms/types";

/** Media filters. A plain value matches for equality and a list of values matches any of them. */
export type MediaFilters = Partial<
	Record<
		| "title"
		| "key"
		| "mimeType"
		| "folderId"
		| "type"
		| "extension"
		| "public"
		| "origin",
		FilterCondition
	>
>;

/** What a read of a page of media takes, apart from its locale. */
export type MediaListOptions = {
	/** One filter object, whose conditions must all match, or a list of them, where any may match. */
	filter?: MediaFilters | MediaFilters[];
	sort?: Array<{
		key:
			| "createdAt"
			| "updatedAt"
			| "title"
			| "fileSize"
			| "width"
			| "height"
			| "mimeType"
			| "extension";
		direction: SortDirection;
	}>;
	/** Audio transcripts, which lists otherwise leave out. */
	include?: "transcripts"[];
	/** One-based page number. */
	page?: number;
	/** Maximum media per page. Use -1 for all matches. */
	perPage?: number;
};
