import collections from "../../libs/collection/collections.js";
import getMigrationStatus from "../../libs/collection/get-collection-migration-status.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { collectionsFormatter } from "../../libs/formatters/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { Collection } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Gets a single collection
 */
const getSingle: ServiceFn<
	[
		{
			key: string;
		},
	],
	Collection
> = async (context, data) => {
	const [collectionRes, collectionsRes] = await Promise.all([
		collections.getSingle(context, { key: data.key }),
		collections.getAll(context, {}),
	]);
	if (collectionRes.error) return collectionRes;
	if (collectionsRes.error) return collectionsRes;

	const tablesRes = await getTableNames(context, collectionRes.data.key);
	if (tablesRes.error) return tablesRes;

	const migrationStatus = await getMigrationStatus(context, {
		collection: collectionRes.data,
	});
	if (migrationStatus.error) return migrationStatus;

	const adminTranslations = context.translate
		.forLocale(context.config.i18n.defaultLocale)
		.adminBundle();

	if (collectionRes.data.getData.mode === "single") {
		const Documents = new DocumentsRepository(context.db);

		const documentRes = await Documents.selectSingle(
			{
				select: ["id"],
				where: [
					{
						key: "is_deleted",
						operator: "=",
						value: context.config.db.getDefault("boolean", "false"),
					},
				],
			},
			{
				tableName: tablesRes.data.document,
			},
		);
		if (documentRes.error) return documentRes;

		return {
			error: undefined,
			data: collectionsFormatter.formatSingle({
				collection: collectionRes.data,
				allCollections: collectionsRes.data,
				queueSupportsScheduling: context.queue.support.scheduling,
				adminTranslations,
				contentRoutes: context.config.contentRoutes,
				include: {
					bricks: true,
					fields: true,
					documentId: true,
				},
				documents: documentRes.data
					? [
							{
								id: documentRes.data.id,
								collection_key: collectionRes.data.key,
							},
						]
					: undefined,
			}),
		};
	}

	return {
		error: undefined,
		data: collectionsFormatter.formatSingle({
			collection: collectionRes.data,
			allCollections: collectionsRes.data,
			queueSupportsScheduling: context.queue.support.scheduling,
			adminTranslations,
			contentRoutes: context.config.contentRoutes,
			migrationStatus: migrationStatus.data,
			include: {
				bricks: true,
				fields: true,
				documentId: true,
			},
		}),
	};
};

export default getSingle;
