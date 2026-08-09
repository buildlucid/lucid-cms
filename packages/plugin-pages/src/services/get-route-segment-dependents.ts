import { buildTableName, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	LucidBrickTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../constants.js";
import getParentPageRelationTable from "../utils/get-parent-page-relation-table.js";
import type { DescendantFieldsResponse } from "./get-descendant-fields.js";

export type RouteSegmentDependent = DescendantFieldsResponse & {
	version_type: Exclude<DocumentVersionType, "revision">;
};

/** Finds page versions that reference a changed route-segment document. */
const getRouteSegmentDependents: ServiceFn<
	[
		{
			collectionKey: string;
			relationKeys: string[];
			targetCollectionKey: string;
			targetDocumentId: number;
			versionTypes: Array<Exclude<DocumentVersionType, "revision">>;
			tables: CollectionTableNames;
		},
	],
	RouteSegmentDependent[]
> = async (context, data) => {
	if (data.relationKeys.length === 0 || data.versionTypes.length === 0) {
		return { error: undefined, data: [] };
	}

	const relationResults = await Promise.all(
		data.relationKeys.map(async (relationKey) => {
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
			const relationAlias = "segment_relation";
			const versionAlias = "source_version";
			const documentAlias = "source_document";
			const result = await context.db
				.query("pages.route-segment.dependents.find", (db) =>
					db
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
							)} = ${data.targetDocumentId}`,
						)
						.where(
							sql<boolean>`${sql.ref(`${relationAlias}.locale`)} = ${
								context.config.localization.defaultLocale
							}`,
						)
						.where(sql<boolean>`${sql.ref(`${relationAlias}.position`)} = 0`)
						.where(`${versionAlias}.type`, "in", data.versionTypes)
						.where(
							`${documentAlias}.is_deleted`,
							"=",
							context.config.db.getDefault("boolean", "false"),
						),
				)
				.many();

			return result;
		}),
	);
	const failedRelation = relationResults.find((result) => result.error);
	if (failedRelation?.error) return failedRelation;

	const versions = new Map<
		number,
		{
			document_id: number;
			document_version_id: number;
			version_type: Exclude<DocumentVersionType, "revision">;
		}
	>();
	for (const result of relationResults) {
		const rows = result.data as unknown as Array<{
			document_id: number;
			document_version_id: number;
			version_type: Exclude<DocumentVersionType, "revision">;
		}>;
		for (const row of rows) versions.set(row.document_version_id, row);
	}
	if (versions.size === 0) return { error: undefined, data: [] };

	const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
	const fullSlugColumn = prefixGeneratedColName(constants.fields.fullSlug.key);
	const parentPageColumn = prefixGeneratedColName("document_id");
	const parentPageTableRes = getParentPageRelationTable(
		data.collectionKey,
		context.config.db.config.tableNameByteLimit,
	);
	if (parentPageTableRes.error) return parentPageTableRes;
	const parentPageTable = parentPageTableRes.data;
	const fieldsAlias = "source_fields";
	const defaultFieldsAlias = "default_fields";
	const parentPageAlias = "parent_page";

	const fieldsResult = await context.db
		.query("pages.route-segment.dependent-fields.find", (db) =>
			db
				.selectFrom(`${data.tables.documentFields} as ${fieldsAlias}`)
				.leftJoin(
					`${data.tables.documentFields} as ${defaultFieldsAlias}`,
					(join) =>
						join
							.onRef(
								`${defaultFieldsAlias}.document_version_id`,
								"=",
								`${fieldsAlias}.document_version_id`,
							)
							.on(
								`${defaultFieldsAlias}.locale`,
								"=",
								context.config.localization.defaultLocale,
							),
				)
				.leftJoin(`${parentPageTable} as ${parentPageAlias}`, (join) =>
					join
						.onRef(
							`${parentPageAlias}.parent_id`,
							"=",
							`${defaultFieldsAlias}.id`,
						)
						.on(
							`${parentPageAlias}.locale`,
							"=",
							context.config.localization.defaultLocale,
						),
				)
				.select([
					`${fieldsAlias}.document_version_id`,
					`${fieldsAlias}.locale`,
					`${fieldsAlias}.${slugColumn} as _slug`,
					`${fieldsAlias}.${fullSlugColumn} as _fullSlug`,
					`${parentPageAlias}.${parentPageColumn} as _parentPage`,
				])
				.where(
					sql<boolean>`${sql.ref(
						`${fieldsAlias}.document_version_id`,
					)} in (${sql.join([...versions.keys()])})`,
				),
		)
		.many();
	if (fieldsResult.error) return fieldsResult;

	const dependents = new Map<number, RouteSegmentDependent>();
	for (const version of versions.values()) {
		dependents.set(version.document_version_id, {
			document_id: version.document_id,
			document_version_id: version.document_version_id,
			version_type: version.version_type,
			rows: [],
		});
	}
	const fieldRows = fieldsResult.data as Array<{
		document_version_id: number;
		locale: string;
		_slug: string | null;
		_fullSlug: string | null;
		_parentPage: number | null;
	}>;
	for (const row of fieldRows) {
		dependents.get(row.document_version_id)?.rows.push({
			locale: row.locale,
			_slug: row._slug,
			_fullSlug: row._fullSlug,
			_parentPage: row._parentPage,
		});
	}

	return {
		error: undefined,
		data: [...dependents.values()].filter((dependent) => dependent.rows.length),
	};
};

export default getRouteSegmentDependents;
