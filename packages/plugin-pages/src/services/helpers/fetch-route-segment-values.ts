import {
	buildTableName,
	prefixGeneratedColName,
	resolveRelatedDocumentVersionType,
} from "@lucidcms/core/plugin";
import type {
	DocumentVersionType,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import type {
	CollectionConfig,
	RouteSegmentTarget,
} from "../../types/types.js";

const targetKey = (
	collectionKey: string,
	documentId: unknown,
	locale: unknown,
) => `${collectionKey}:${documentId}:${locale}`;

/** Fetches all referenced route segment fields in one query per target collection. */
const fetchRouteSegmentValues: ServiceFn<
	[
		{
			collection: CollectionConfig;
			versionType: Exclude<DocumentVersionType, "revision">;
			targets: RouteSegmentTarget[];
			locales: string[];
		},
	],
	Map<string, Record<string, unknown>>
> = async (context, data) => {
	const targetsByCollection = new Map<string, RouteSegmentTarget[]>();

	for (const target of data.targets) {
		const targets = targetsByCollection.get(target.collectionKey) ?? [];
		targets.push(target);
		targetsByCollection.set(target.collectionKey, targets);
	}

	const results = await Promise.all(
		Array.from(targetsByCollection, async ([collectionKey, targets]) => {
			const [documentTableRes, versionTableRes, fieldsTableRes] =
				await Promise.all([
					buildTableName<LucidDocumentTableName>(
						"document",
						{ collection: collectionKey },
						context.config.db.config.tableNameByteLimit,
					),
					buildTableName<LucidVersionTableName>(
						"versions",
						{ collection: collectionKey },
						context.config.db.config.tableNameByteLimit,
					),
					buildTableName<LucidBrickTableName>(
						"document-fields",
						{ collection: collectionKey },
						context.config.db.config.tableNameByteLimit,
					),
				]);
			if (documentTableRes.error) return documentTableRes;
			if (versionTableRes.error) return versionTableRes;
			if (fieldsTableRes.error) return fieldsTableRes;

			const documentTable = documentTableRes.data.name;
			const versionTable = versionTableRes.data.name;
			const fieldsTable = fieldsTableRes.data.name;

			const selectedTargets = targets.filter(
				(target, index) =>
					targets.findIndex(
						(candidate) =>
							candidate.index === target.index &&
							candidate.field === target.field,
					) === index,
			);

			const requiredLocales = [
				...new Set(
					targets.flatMap((target) =>
						target.localized
							? data.locales
							: [context.config.localization.defaultLocale],
					),
				),
			];

			const targetVersionType = resolveRelatedDocumentVersionType({
				collections: context.config.collections,
				sourceCollectionKey: data.collection.key,
				sourceVersionType: data.versionType,
				targetCollectionKey: collectionKey,
			});

			const result = await context.db
				.query("pages.route-segment.values.find", (db) =>
					db
						.selectFrom(documentTable)
						.innerJoin(
							versionTable,
							// @ts-expect-error Dynamic generated table names are resolved at runtime.
							`${versionTable}.document_id`,
							`${documentTable}.id`,
						)
						.innerJoin(
							fieldsTable,
							// @ts-expect-error Dynamic generated table names are resolved at runtime.
							`${fieldsTable}.document_version_id`,
							`${versionTable}.id`,
						)
						// @ts-expect-error Dynamic generated table names are resolved at runtime.
						.select([
							`${documentTable}.id as document_id`,
							`${fieldsTable}.locale`,
						])
						.select(
							selectedTargets.map((target) =>
								sql<unknown>`${sql.ref(
									`${fieldsTable}.${prefixGeneratedColName(target.field)}`,
								)}`.as(`segment_${target.index}`),
							),
						)
						.where(`${documentTable}.id`, "in", [
							...new Set(targets.map((target) => target.documentId)),
						])
						.where(`${versionTable}.type`, "=", targetVersionType)
						.where(
							`${documentTable}.is_deleted`,
							"=",
							context.config.db.getDefault("boolean", "false"),
						)
						.where(`${fieldsTable}.locale`, "in", requiredLocales),
				)
				.many();

			return result.error
				? result
				: {
						error: undefined,
						data: {
							collectionKey,
							rows: result.data as Array<Record<string, unknown>>,
						},
					};
		}),
	);
	const failedResult = results.find((result) => result.error);
	if (failedResult?.error) return failedResult;

	const rows = new Map<string, Record<string, unknown>>();
	for (const result of results) {
		if (!result.data) continue;
		for (const row of result.data.rows) {
			rows.set(
				targetKey(result.data.collectionKey, row.document_id, row.locale),
				row,
			);
		}
	}

	return { error: undefined, data: rows };
};

export { targetKey };
export default fetchRouteSegmentValues;
