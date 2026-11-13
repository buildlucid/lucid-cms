import { copy, z } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow } from "../../constants.js";
import type { IndexNowTables } from "./tables.js";

const rowSchema = z.object({
	url: z.string(),
	last_modified: z.string().nullable(),
});

/** The stored URLs still marked listed, keyed by URL with their `lastModified`, for a mark to diff against. */
const getStoredUrls: ServiceFn<[], Map<string, string | null>> = async (
	context,
) => {
	try {
		const query = context.db.kysely
			.$extendTables<IndexNowTables>()
			.selectFrom(indexNow.urlsTable)
			.select(["url", "last_modified"])
			.where("listed", "=", context.config.db.getDefault("boolean", "true"));
		const rowsRes = await context.db
			.query("seo.index-now.urls.listed", () => query)
			.many({ schema: rowSchema });
		if (rowsRes.error) return rowsRes;

		return {
			error: undefined,
			data: new Map(rowsRes.data.map((row) => [row.url, row.last_modified])),
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.seo.index.now.urls.failed"),
			},
			data: undefined,
		};
	}
};

export default getStoredUrls;
