import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CollectionResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			key: string;
			include?: {
				bricks?: boolean;
				fields?: boolean;
				documentId?: boolean;
			};
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

	const tablesRes = collection.tableNames;
	if (tablesRes.error) return tablesRes;

	const CollectionsFormatter = Formatter.get("collections");

	if (
		data.include?.documentId === true &&
		collection.getData.mode === "single"
	) {
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
				validation: {
					enabled: true,
				},
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
				include: data.include,
				documents: [
					{
						id: documentRes.data.id,
						collection_key: collection.key,
					},
				],
			}),
		};
	}

	return {
		error: undefined,
		data: CollectionsFormatter.formatSingle({
			collection: collection,
			include: data.include,
		}),
	};
};

export default getSingle;
