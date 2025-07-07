import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import getSchemaStatus from "../../libs/collection/schema/database/get-schema-status.js";
import { getTableNames } from "../../libs/collection/schema/database/schema-filters.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionResponse } from "../../types/response.js";

/**
 * Gets a single collection
 * @todo integrate the schema status into the response so that the SPA can alert the user
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

	const schemaStatusRes = await getSchemaStatus(context, {
		collection: collection,
	});
	if (schemaStatusRes.error) return schemaStatusRes;

	const CollectionsFormatter = Formatter.get("collections");

	if (collection.getData.mode === "single") {
		const Documents = Repository.get(
			"documents",
			context.db,
			context.config.db,
		);

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
			data: CollectionsFormatter.formatSingle({
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
		data: CollectionsFormatter.formatSingle({
			collection: collection,
			schemaStatus: schemaStatusRes.data,
			include: {
				bricks: true,
				fields: true,
				documentId: true,
			},
		}),
	};
};

export default getSingle;
