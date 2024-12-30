import collectionsServices from "../collections/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { BrickResponse, FieldResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

const getMultiple: ServiceFn<
	[
		{
			versionId: number;
			collectionKey: string;
			documentFieldsRelationStatus?: Exclude<DocumentVersionType, "revision">;
		},
	],
	{
		bricks: Array<BrickResponse>;
		fields: Array<FieldResponse>;
	}
> = async (context, data) => {
	const CollectionDocumentBricksRepo = Repository.get(
		"collection-document-bricks",
		context.db,
		context.config.db,
	);

	const CollectionDocumentBricksFormatter = Formatter.get(
		"collection-document-bricks",
	);

	const [bricks, collectionRes] = await Promise.all([
		CollectionDocumentBricksRepo.selectMultipleByVersionId({
			documentFieldsRelationStatus:
				data.documentFieldsRelationStatus ?? "draft",
			versionId: data.versionId,
			config: context.config,
		}),
		collectionsServices.getSingleInstance(context, {
			key: data.collectionKey,
		}),
	]);
	if (collectionRes.error) return collectionRes;

	return {
		error: undefined,
		data: {
			bricks: CollectionDocumentBricksFormatter.formatMultiple({
				bricks: bricks,
				collection: collectionRes.data,
				config: context.config,
			}),
			fields: CollectionDocumentBricksFormatter.formatCollectionPseudoBrick({
				bricks: bricks,
				collection: collectionRes.data,
				config: context.config,
			}),
		},
	};
};

export default getMultiple;
