import {
	copy,
	defineContentApiRoute,
	formatAPIResponse,
	LucidAPIError,
	z,
} from "@lucidcms/core";

const querySchema = z.object({
	query: z.string().trim().min(1).max(200),
	locale: z.enum(["en", "fr"]).default("en"),
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(20).default(10),
});

const hitSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	path: z.string().optional(),
	documentId: z.number().int(),
	locale: z.enum(["en", "fr"]),
});

/** Public page search for the site's search page; the scoped `/search` route serves integrations. */
export default defineContentApiRoute({
	method: "get",
	path: "/site-search",
	access: { type: "public" },
	schema: { query: { string: querySchema, formatted: querySchema } },
	openAPI: {
		summary: "Search published playground pages from the website",
		tags: ["Playground"],
	},
	handler: async ({ hono, toolkit, input }) => {
		try {
			const { query, locale, page, perPage } = input.query;

			if (!toolkit.typesense) {
				throw new LucidAPIError({
					status: 503,
					message: copy("server:search.unavailable"),
				});
			}

			const result = await toolkit.typesense.client
				.collections<z.infer<typeof hitSchema>>("lucid_node_pages")
				.documents()
				.search({
					q: query,
					query_by: "title",
					filter_by: `locale:=${locale}`,
					include_fields: "id,title,path,documentId,locale",
					page,
					per_page: perPage,
				});

			const hits = z
				.array(hitSchema)
				.parse(result.hits?.map((hit) => hit.document) ?? []);

			return hono.json(
				formatAPIResponse(hono, {
					data: hits,
					pagination: { count: result.found, page, perPage },
				}),
			);
		} catch {
			throw new LucidAPIError({
				status: 503,
				message: copy("server:search.unavailable"),
			});
		}
	},
});
