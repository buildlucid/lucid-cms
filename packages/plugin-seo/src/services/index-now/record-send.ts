import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow } from "../../constants.js";
import type { IndexNowTables } from "./tables.js";

/**
 * Stores when a send finished and how many URLs IndexNow accepted, for the Operations tile. Never
 * replaces a later finish, so a send that overlapped a newer one doesn't write over it.
 */
const recordSend: ServiceFn<
	[{ sentAt: string; urlCount: number }],
	undefined
> = async (context, data) => {
	try {
		const query = context.db.kysely
			.$extendTables<IndexNowTables>()
			.updateTable(indexNow.stateTable)
			.set({ last_sent_at: data.sentAt, last_url_count: data.urlCount })
			.where((eb) =>
				eb.or([
					eb("last_sent_at", "is", null),
					eb("last_sent_at", "<=", data.sentAt),
				]),
			);
		const recordRes = await context.db
			.query("seo.index-now.state.record", () => query)
			.many();
		if (recordRes.error) return recordRes;

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

export default recordSend;
