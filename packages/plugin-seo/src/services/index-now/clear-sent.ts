import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow } from "../../constants.js";
import type { IndexNowTables } from "./tables.js";

/**
 * Settles URLs IndexNow accepted: listed rows stop being pending and unlisted rows are removed.
 * Only rows marked by `revision` or before, so a row marked again while it was sent stays pending.
 */
const clearSent: ServiceFn<
	[{ urls: string[]; revision: number }],
	undefined
> = async (context, data) => {
	try {
		const db = context.db.kysely.$extendTables<IndexNowTables>();
		const adapter = context.config.db;
		const yes = adapter.getDefault("boolean", "true");
		const no = adapter.getDefault("boolean", "false");
		const batchSize = adapter.getQueryBatchSize({
			parametersPerItem: 1,
			reservedParameters: 3,
		});

		for (let offset = 0; offset < data.urls.length; offset += batchSize) {
			const urls = data.urls.slice(offset, offset + batchSize);

			const settleQuery = db
				.updateTable(indexNow.urlsTable)
				.set({ pending: no })
				.where("url", "in", urls)
				.where("listed", "=", yes)
				.where("revision", "<=", data.revision);
			const settleRes = await context.db
				.query("seo.index-now.urls.settle", () => settleQuery)
				.many();
			if (settleRes.error) return settleRes;

			const removeQuery = db
				.deleteFrom(indexNow.urlsTable)
				.where("url", "in", urls)
				.where("listed", "=", no)
				.where("revision", "<=", data.revision);
			const removeRes = await context.db
				.query("seo.index-now.urls.remove", () => removeQuery)
				.many();
			if (removeRes.error) return removeRes;
		}

		return { error: undefined, data: undefined };
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

export default clearSent;
