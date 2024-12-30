import Repository from "../../libs/repositories/index.js";
import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteMultipleBricks: ServiceFn<
	[
		{
			versionId: number;
			apply: {
				bricks: boolean;
				collectionFields: boolean;
			};
		},
	],
	undefined
> = async (context, data) => {
	const CollectionDocumentBricksRepo = Repository.get(
		"collection-document-bricks",
		context.db,
		context.config.db,
	);

	if (data.apply.collectionFields) {
		await CollectionDocumentBricksRepo.deleteMultiple({
			where: [
				{
					key: "collection_document_version_id",
					operator: "=",
					value: data.versionId,
				},
				{
					key: "brick_type",
					operator: "=",
					value: constants.brickTypes.collectionFields,
				},
			],
		});
	}
	if (data.apply.bricks) {
		await CollectionDocumentBricksRepo.deleteMultiple({
			where: [
				{
					key: "collection_document_version_id",
					operator: "=",
					value: data.versionId,
				},
				{
					key: "brick_type",
					operator: "!=",
					value: constants.brickTypes.collectionFields,
				},
			],
		});
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultipleBricks;
