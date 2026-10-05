import {
	buildTableName,
	prefixGeneratedColName,
} from "@lucidcms/core/extension";
import type {
	CollectionTableNames,
	DocumentVersionType,
	LucidBrickTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";

export type RouteSegmentDependent = {
	document_id: number;
	document_version_id: number;
	version_type: Exclude<DocumentVersionType, "revision">;
};

const getRouteSegmentDependents: ServiceFn<
	[
		{
			collectionKey: string;
			relationKeys: string[];
			targetCollectionKey: string;
			targetDocumentIds: number[];
			versionTypes: Array<Exclude<DocumentVersionType, "revision">>;
			tables: CollectionTableNames;
		},
	],
	RouteSegmentDependent[]
> = async (context, data) => {
	if (data.relationKeys.length === 0 || data.versionTypes.length === 0) {
		return { error: undefined, data: [] };
	}

	const relationAlias = "segment_relation";
	const versionAlias = "source_version";
	const documentAlias = "source_document";
	const batchSize = context.config.db.getQueryBatchSize({
		parametersPerItem: 1,
		reservedParameters: data.versionTypes.length + 3,
	});

	const versions = new Map<number, RouteSegmentDependent>();
	for (const relationKey of data.relationKeys) {
		const tableRes = buildTableName<LucidBrickTableName>(
			"cf_relation",
			{
				collection: data.collectionKey,
				fieldPath: [relationKey],
			},
			context.config.db.config.tableNameByteLimit,
		);
		if (tableRes.error) return tableRes;
		const relationTable = tableRes.data.name;

		for (
			let offset = 0;
			offset < data.targetDocumentIds.length;
			offset += batchSize
		) {
			const targetDocumentIds = data.targetDocumentIds.slice(
				offset,
				offset + batchSize,
			);
			const query = context.db.kysely
				.selectFrom(`${relationTable} as ${relationAlias}`)
				.innerJoin(
					`${data.tables.version} as ${versionAlias}`,
					`${versionAlias}.id`,
					`${relationAlias}.document_version_id`,
				)
				.innerJoin(
					`${data.tables.document} as ${documentAlias}`,
					`${documentAlias}.id`,
					`${versionAlias}.document_id`,
				)
				.select([
					`${versionAlias}.id as document_version_id`,
					`${versionAlias}.document_id`,
					`${versionAlias}.type as version_type`,
				])
				.where(
					sql<boolean>`${sql.ref(
						`${relationAlias}.${prefixGeneratedColName("collection_key")}`,
					)} = ${data.targetCollectionKey}`,
				)
				.where(
					sql<boolean>`${sql.ref(
						`${relationAlias}.${prefixGeneratedColName("document_id")}`,
					)} in (${sql.join(targetDocumentIds)})`,
				)
				.where(sql<boolean>`${sql.ref(`${relationAlias}.locale`)} is null`)
				.where(sql<boolean>`${sql.ref(`${relationAlias}.position`)} = 0`)
				.where(`${versionAlias}.type`, "in", data.versionTypes)
				.where(
					`${documentAlias}.is_deleted`,
					"=",
					context.config.db.getDefault("boolean", "false"),
				);

			const rowsRes = await context.db
				.query<RouteSegmentDependent>(
					"pages.route-segment.dependents.find",
					() => query,
				)
				.many();
			if (rowsRes.error) return rowsRes;

			for (const row of rowsRes.data) {
				versions.set(row.document_version_id, row);
			}
		}
	}

	return { error: undefined, data: [...versions.values()] };
};

export default getRouteSegmentDependents;
