import z from "zod";

/** Page inputs shared by tools that return lists. */
export const paginationInput = {
	page: z.number().int().positive().default(1),
	perPage: z.number().int().min(1).max(50).default(20),
};

export const paginationSchema = z
	.object({
		count: z.number().meta({ description: "Total matching items." }),
		page: z.number().meta({ description: "Current one-based page." }),
		perPage: z.number().meta({ description: "Requested page size." }),
		nextPage: z
			.number()
			.nullable()
			.meta({ description: "Next page, or null at the end." }),
	})
	.meta({ description: "Pagination for data." });

/** Builds pagination details for a result that was already paged by a service. */
export const getPagination = (
	count: number,
	page: number,
	perPage: number,
): z.output<typeof paginationSchema> => ({
	count,
	page,
	perPage,
	nextPage: page * perPage < count ? page + 1 : null,
});

/** Pages an in-memory list. */
export const paginate = <T>(items: T[], page: number, perPage: number) => ({
	data: items.slice((page - 1) * perPage, page * perPage),
	pagination: getPagination(items.length, page, perPage),
});
