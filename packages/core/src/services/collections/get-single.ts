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

	const CollectionsFormatter = Formatter.get("collections");

	if (
		data.include?.documentId === true &&
		collection.getData.mode === "single"
	) {
		const CollectionDocumentsRepo = Repository.get(
			"collection-documents",
			context.db,
			context.config.db,
		);

		const document = await CollectionDocumentsRepo.selectSingle({
			select: ["id"],
			where: [
				{
					key: "is_deleted",
					operator: "=",
					value: context.config.db.getDefault("boolean", "false"),
				},
				{
					key: "collection_key",
					operator: "=",
					value: collection.key,
				},
			],
		});

		return {
			error: undefined,
			data: CollectionsFormatter.formatSingle({
				collection: collection,
				include: data.include,
				documents: [
					{
						id: document?.id,
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
