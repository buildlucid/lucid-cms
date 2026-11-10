import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { PATH_HISTORY_TABLE } from "../constants.js";
import {
	type PreviousPath,
	previousPathSchema,
} from "../schema/previous-paths.js";
import type { PathHistoryTables } from "../types/tables.js";
import type { RedirectTargetCollection } from "../types/types.js";
import findCurrentPath from "./redirects/find-current-path.js";

/**
 * A page's recorded old paths per environment and locale, newest first, leaving out the ones it uses
 * now. An environment limits them to that one.
 */
const getPreviousPaths: ServiceFn<
	[
		{
			collection: RedirectTargetCollection;
			documentId: number;
			environment?: string;
		},
	],
	PreviousPath[]
> = async (context, data) => {
	try {
		let query = context.db.kysely
			.$extendTables<PathHistoryTables>()
			.selectFrom(PATH_HISTORY_TABLE)
			.select(["id", "environment", "locale", "path"])
			.where("collection_key", "=", data.collection.key)
			.where("document_id", "=", data.documentId)
			.orderBy("recorded_at", "desc")
			.orderBy("id", "desc");
		if (data.environment !== undefined) {
			query = query.where("environment", "=", data.environment);
		}

		const rowsRes = await context.db
			.query("pages.previous-paths.find", () => query)
			.many({ schema: previousPathSchema });
		if (rowsRes.error) return rowsRes;

		const currentPaths = new Map<string, string | null>();
		const previous: PreviousPath[] = [];
		for (const row of rowsRes.data) {
			const key = `${row.environment}:${row.locale ?? ""}`;
			if (!currentPaths.has(key)) {
				const currentRes = await findCurrentPath(context, {
					collectionKey: data.collection.key,
					documentId: data.documentId,
					environment: row.environment,
					locale: row.locale,
					localized: data.collection.localized,
				});
				if (currentRes.error) return currentRes;
				currentPaths.set(key, currentRes.data);
			}
			if (currentPaths.get(key) !== row.path) previous.push(row);
		}

		return { error: undefined, data: previous };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.previous.paths.fetch.failed"),
			},
			data: undefined,
		};
	}
};

export default getPreviousPaths;
