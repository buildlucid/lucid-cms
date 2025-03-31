import collectionsServices from "../collections/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { BrickResponse, FieldResponse } from "../../types/response.js";
import type {
	DocumentVersionType,
	LucidVersionTableName,
} from "../../libs/db/types.js";
import buildTableName from "../collection-migrator/helpers/build-table-name.js";

/**
 * Returns all of the bricks and collection fields
 * @todo implement helper to generate all possible brick tables names
 * @todo format query response
 */
const getMultiple: ServiceFn<
	[
		{
			versionId: number;
			collectionKey: string;
			versionType?: Exclude<DocumentVersionType, "revision">;
		},
	],
	// {
	// 	bricks: Array<BrickResponse>;
	// 	fields: Array<FieldResponse>;
	// }
	undefined
> = async (context, data) => {
	const DocumentBricks = Repository.get(
		"document-bricks",
		context.db,
		context.config.db,
	);

	const versionsTableRes = buildTableName<LucidVersionTableName>("versions", {
		collection: data.collectionKey,
	});
	if (versionsTableRes.error) return versionsTableRes;

	const [bricksRes, collectionRes] = await Promise.all([
		DocumentBricks.selectMultipleByVersionId(
			{
				versionType: data.versionType ?? "draft",
				versionId: data.versionId,
				brickTables: [
					"lucid_document__simple__fields",
					"lucid_document__simple__simple",
					"lucid_document__simple__simple__items",
					"lucid_document__simple__simple__items__nestedItems",
				],
			},
			{
				tableName: versionsTableRes.data,
			},
		),
		collectionsServices.getSingleInstance(context, {
			key: data.collectionKey,
		}),
	]);
	if (bricksRes.error) return bricksRes;
	if (collectionRes.error) return collectionRes;

	console.log(bricksRes.data);

	return {
		error: undefined,
		data: undefined,
		// data: {
		// bricks: CollectionDocumentBricksFormatter.formatMultiple({
		// 	bricks: bricks,
		// 	collection: collectionRes.data,
		// 	config: context.config,
		// }),
		// fields: CollectionDocumentBricksFormatter.formatCollectionPseudoBrick({
		// 	bricks: bricks,
		// 	collection: collectionRes.data,
		// 	config: context.config,
		// }),
		// },
	};
};

export default getMultiple;
