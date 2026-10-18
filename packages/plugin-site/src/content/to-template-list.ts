/** Pagination as the content API's response meta reports it. */
export type TemplatePagination = {
	currentPage: number;
	perPage: number;
	total: number;
	lastPage: number;
};

/** What list functions such as `documentList()` return. */
export type TemplateList<Item> = {
	items: Item[];
	pagination: TemplatePagination;
};

/** Page and page size when a list function is given none; passed to the toolkit so pagination always matches. */
export const listDefaults = { page: 1, perPage: 10 } as const;

const toTemplateList = <Item>(
	items: Item[],
	props: { total: number; page: number; perPage: number },
): TemplateList<Item> => ({
	items,
	pagination: {
		currentPage: props.page,
		perPage: props.perPage,
		total: props.total,
		// Matches the content API, where -1 returns every match on one page.
		lastPage:
			props.perPage === -1
				? props.total > 0
					? 1
					: 0
				: Math.ceil(props.total / props.perPage),
	},
});

export default toTemplateList;
