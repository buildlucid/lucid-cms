import { z } from "@lucidcms/core";
import {
	buildTableName,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type { LucidBrickTableName, ServiceFn } from "@lucidcms/core/types";
import type {
	CollectionConfig,
	RouteSegmentSelection,
} from "../types/types.js";

const getStoredRouteSegmentSelections: ServiceFn<
	[
		{
			collection: CollectionConfig;
			sources: Array<{ sourceKey: string; versionId: number }>;
		},
	],
	RouteSegmentSelection[]
> = async (context, data) => {
	if (data.sources.length === 0 || data.collection.segments.length === 0) {
		return { error: undefined, data: [] };
	}
	const versionIds = [
		...new Set(data.sources.map((source) => source.versionId)),
	];
	const batchSize = context.config.db.getQueryBatchSize({
		parametersPerItem: 1,
		reservedParameters: 1,
	});
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
			const rows: Array<{
				document_version_id: number;
				collection_key: string;
				document_id: number;
			}> = [];
			for (let offset = 0; offset < versionIds.length; offset += batchSize) {
				const query = context.db.kysely
					.selectFrom(table)
					.select([
						`${table}.document_version_id`,
						`${table}.${prefixGeneratedColName("collection_key")} as collection_key`,
						`${table}.${prefixGeneratedColName("document_id")} as document_id`,
					])
					.where(
						`${table}.document_version_id`,
						"in",
						versionIds.slice(offset, offset + batchSize),
					)
					.where(`${table}.locale`, "is", null)
					.where(`${table}.position`, "=", 0);

				const result = await context.db
					.query("pages.route-segment.relation.find", () => query)
					.many({
						schema: z.object({
							document_version_id: z.number(),
							collection_key: z.string(),
							document_id: z.number(),
						}),
					});
				if (result.error) return result;
				rows.push(...result.data);
			}

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
