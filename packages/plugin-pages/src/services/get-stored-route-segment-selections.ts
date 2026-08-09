import { buildTableName, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type { LucidBrickTableName, ServiceFn } from "@lucidcms/core/types";
import type {
	CollectionConfig,
	RouteSegmentSelection,
} from "../types/types.js";

/** Reads stored route-segment selections for a batch of page versions. */
const getStoredRouteSegmentSelections: ServiceFn<
	[
		{
			collection: CollectionConfig;
			sources: Array<{ sourceKey: string; versionId: number }>;
		},
	],
	RouteSegmentSelection[]
> = async (context, data) => {
	if (data.sources.length === 0) return { error: undefined, data: [] };
	const versionIds = [
		...new Set(data.sources.map((source) => source.versionId)),
	];
	const results = await Promise.all(
		data.collection.segments.map(async (segment, index) => {
			const tableRes = buildTableName<LucidBrickTableName>(
				"cf_relation",
				{
					collection: data.collection.key,
					fieldPath: [segment.relation],
				},
				context.config.db.config.tableNameByteLimit,
			);
			if (tableRes.error) return tableRes;

			const table = tableRes.data.name;
			const result = await context.db
				.query("pages.route-segment.relation.find", (db) =>
					db
						.selectFrom(table)
						.select([
							`${table}.document_version_id`,
							`${table}.${prefixGeneratedColName("collection_key")} as collection_key`,
							`${table}.${prefixGeneratedColName("document_id")} as document_id`,
						])
						.where(`${table}.document_version_id`, "in", versionIds)
						.where(
							`${table}.locale`,
							"=",
							context.config.localization.defaultLocale,
						)
						.where(`${table}.position`, "=", 0),
				)
				.many();
			if (result.error) return result;

			const rows = result.data as Array<{
				document_version_id: number;
				collection_key: string;
				document_id: number;
			}>;
			const rowsByVersionId = new Map(
				rows.map((row) => [row.document_version_id, row]),
			);

			return {
				error: undefined,
				data: data.sources.map(({ sourceKey, versionId }) => {
					const row = rowsByVersionId.get(versionId);
					return {
						sourceKey,
						index,
						collectionKey: row?.collection_key,
						documentId: row?.document_id,
					} satisfies RouteSegmentSelection;
				}),
			};
		}),
	);
	const failedResult = results.find((result) => result.error);
	if (failedResult?.error) return failedResult;

	return {
		error: undefined,
		data: results.flatMap((result) => result.data ?? []),
	};
};

export default getStoredRouteSegmentSelections;
