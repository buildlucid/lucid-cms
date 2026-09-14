import {
	copy,
	defineContentApiRoute,
	ExternalScopes,
	formatAPIResponse,
	LucidAPIError,
	z,
} from "@lucidcms/core";

const querySchema = z.object({
	query: z.string().trim().min(1).max(200),
	locale: z.enum(["en", "fr"]).default("en"),
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(50).default(20),
});

const hitSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	path: z.string().optional(),
	documentId: z.number().int(),
	locale: z.enum(["en", "fr"]),
});

export default defineContentApiRoute({
	method: "get",
	path: "/search",
	access: { type: "scoped", scopes: [ExternalScopes.DocumentRead("page")] },
	schema: { query: { string: querySchema, formatted: querySchema } },
	openAPI: {
		summary: "Search published playground pages",
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
					data: hits.map((hit) => ({ ...hit, kind: "page" as const })),
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
