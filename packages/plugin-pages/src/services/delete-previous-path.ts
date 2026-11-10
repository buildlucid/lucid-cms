import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { PATH_HISTORY_TABLE } from "../constants.js";
import type { PathHistoryTables } from "../types/tables.js";

/** Forgets one of a page's old paths, so it no longer redirects. */
const deletePreviousPath: ServiceFn<
	[{ collectionKey: string; documentId: number; id: number }],
	undefined
> = async (context, data) => {
	try {
		const query = context.db.kysely
			.$extendTables<PathHistoryTables>()
			.deleteFrom(PATH_HISTORY_TABLE)
			.where("id", "=", data.id)
			.where("collection_key", "=", data.collectionKey)
			.where("document_id", "=", data.documentId);

		const deleteRes = await context.db
			.query("pages.previous-paths.delete", () => query)
			.many();
		if (deleteRes.error) return deleteRes;

		return { error: undefined, data: undefined };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.previous.paths.delete.failed"),
			},
			data: undefined,
		};
	}
};

export default deletePreviousPath;
