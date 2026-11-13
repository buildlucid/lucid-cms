import { copy, z } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow } from "../../constants.js";
import type { IndexNowTables } from "./tables.js";

/** What the Operations tile shows. */
export type IndexNowStatus = {
	/** URLs marked to send that IndexNow hasn't accepted yet. */
	pending: number;
	/** When IndexNow last accepted URLs, and how many. Null before the first send it accepted. */
	lastSend: { sentAt: string; urlCount: number } | null;
};

const stateSchema = z.object({
	last_sent_at: z.string().nullable(),
	last_url_count: z.coerce.number().nullable(),
});
const countSchema = z.object({ count: z.coerce.number() });

/** Reads how many URLs are waiting to be sent, and the last accepted send. */
const getStatus: ServiceFn<[], IndexNowStatus> = async (context) => {
	try {
		const db = context.db.kysely.$extendTables<IndexNowTables>();

		const stateQuery = db
			.selectFrom(indexNow.stateTable)
			.select(["last_sent_at", "last_url_count"]);
		const stateRes = await context.db
			.query("seo.index-now.state.select", () => stateQuery)
			.first({ schema: stateSchema, required: true });
		if (stateRes.error) return stateRes;

		const countQuery = db
			.selectFrom(indexNow.urlsTable)
			.select((eb) => eb.fn.countAll().as("count"))
			.where("pending", "=", context.config.db.getDefault("boolean", "true"));
		const countRes = await context.db
			.query("seo.index-now.urls.count", () => countQuery)
			.first({ schema: countSchema, required: true });
		if (countRes.error) return countRes;

		const state = stateRes.data;
		return {
			error: undefined,
			data: {
				pending: countRes.data.count,
				lastSend:
					state.last_sent_at !== null && state.last_url_count !== null
						? { sentAt: state.last_sent_at, urlCount: state.last_url_count }
						: null,
			},
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

export default getStatus;
