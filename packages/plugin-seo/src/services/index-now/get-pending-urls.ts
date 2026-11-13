import { copy, z } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow } from "../../constants.js";
import type { IndexNowTables } from "./tables.js";

const rowSchema = z.object({ id: z.coerce.number(), url: z.string() });

/**
 * One page of pending URLs, oldest row first, after the row `after`. Only rows marked by `revision`
 * or before, as later marks' rows go with their own sends.
 */
const getPendingUrls: ServiceFn<
	[{ revision: number; after: number; limit: number }],
	Array<{ id: number; url: string }>
> = async (context, data) => {
	try {
		const query = context.db.kysely
			.$extendTables<IndexNowTables>()
			.selectFrom(indexNow.urlsTable)
			.select(["id", "url"])
			.where("pending", "=", context.config.db.getDefault("boolean", "true"))
			.where("revision", "<=", data.revision)
			.where("id", ">", data.after)
			.orderBy("id")
			.limit(data.limit);
		return await context.db
			.query("seo.index-now.urls.pending", () => query)
			.many({ schema: rowSchema });
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

export default getPendingUrls;
