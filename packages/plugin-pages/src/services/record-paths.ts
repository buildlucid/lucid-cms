import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { sql } from "kysely";
import { PATH_HISTORY_TABLE } from "../constants.js";
import type { PathHistoryTables } from "../types/tables.js";
import type {
	CollectionConfig,
	ProjectedPath,
	RouteScope,
} from "../types/types.js";
import isPublishedVersion from "../utils/is-published-version.js";
import normalizePathValue from "../utils/normalize-path-value.js";

/**
 * Records published paths for future redirects. The latest page using a path owns it. Skips drafts
 * and request versions.
 */
const recordPaths: ServiceFn<
	[
		{
			collection: CollectionConfig;
			scope: RouteScope;
			values: ProjectedPath[];
		},
	],
	undefined
> = async (context, data) => {
	if (!data.collection.trackPaths || data.scope.type !== "version") {
		return { error: undefined, data: undefined };
	}
	const environment = data.scope.versionType;
	const collectionInstance = context.config.collections.find(
		(collection) => collection.key === data.collection.key,
	);
	if (
		!collectionInstance ||
		!isPublishedVersion(collectionInstance, environment)
	) {
		return { error: undefined, data: undefined };
	}

	const byLocale = new Map<
		string | null,
		Array<{ documentId: number; path: string }>
	>();
	for (const document of data.values) {
		for (const [locale, value] of document.values) {
			const path = normalizePathValue(value);
			if (!path) continue;
			const entries = byLocale.get(locale) ?? [];
			entries.push({ documentId: document.documentId, path });
			byLocale.set(locale, entries);
		}
	}

	try {
		const db = context.db.kysely.$extendTables<PathHistoryTables>();
		const recordedAt = new Date().toISOString();
		const batchSize = context.config.db.getQueryBatchSize({
			parametersPerItem: 6,
			reservedParameters: 2,
		});

		for (const [locale, entries] of byLocale) {
			for (let offset = 0; offset < entries.length; offset += batchSize) {
				const batch = entries.slice(offset, offset + batchSize);

				const clearQuery = db
					.deleteFrom(PATH_HISTORY_TABLE)
					.where("environment", "=", environment)
					.where(
						"path",
						"in",
						batch.map((entry) => entry.path),
					)
					.where(
						locale === null
							? sql<boolean>`${sql.ref("locale")} is null`
							: sql<boolean>`${sql.ref("locale")} = ${locale}`,
					);
				const clearRes = await context.db
					.query("pages.path-history.replace", () => clearQuery)
					.many();
				if (clearRes.error) return clearRes;

				const insertQuery = db.insertInto(PATH_HISTORY_TABLE).values(
					batch.map((entry) => ({
						collection_key: data.collection.key,
						document_id: entry.documentId,
						environment,
						locale,
						path: entry.path,
						recorded_at: recordedAt,
					})),
				);
				const insertRes = await context.db
					.query("pages.path-history.record", () => insertQuery)
					.many();
				if (insertRes.error) return insertRes;
			}
		}

		return { error: undefined, data: undefined };
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.path.history.record.failed"),
			},
			data: undefined,
		};
	}
};

export default recordPaths;
