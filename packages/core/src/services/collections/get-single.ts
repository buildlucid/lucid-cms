import T from "../../translations/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import { collectionsFormatter } from "../../libs/formatters/index.js";
import getMigrationStatus from "../../libs/collection/get-collection-migration-status.js";
import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionResponse } from "../../types/response.js";

/**
 * Gets a single collection
 */
const getSingle: ServiceFn<
	[
		{
			key: string;
		},
	],
	CollectionResponse
> = async (context, data) => {
	const collection = context.config.collections?.find(
		(c) => c.key === data.key,
	);

	if (collection === undefined) {
		return {
			error: {
				type: "basic",
				message: T("collection_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const tablesRes = await getTableNames(context, collection.key);
	if (tablesRes.error) return tablesRes;

	const migrationStatus = await getMigrationStatus(context, {
		collection: collection,
	});
	if (migrationStatus.error) return migrationStatus;

	if (collection.getData.mode === "single") {
		const Documents = new DocumentsRepository(context.db, context.config.db);

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
				collection: collection,
				include: {
					bricks: true,
					fields: true,
					documentId: true,
				},
				documents: documentRes.data
					? [
							{
								id: documentRes.data.id,
								collection_key: collection.key,
							},
						]
					: undefined,
			}),
		};
	}

	return {
		error: undefined,
		data: collectionsFormatter.formatSingle({
			collection: collection,
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
