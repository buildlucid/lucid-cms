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
import getAllBrickTables from "../collection-migrator/helpers/get-all-brick-tables.js";
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";

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

	const collectionRes = await collectionsServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const brickTablesRes = getAllBrickTables(
		collectionRes.data,
		context.config.db,
	);
	if (brickTablesRes.error) return brickTablesRes;

	const bricksQueryRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionType: data.versionType ?? "draft",
			versionId: data.versionId,
			bricks: brickTablesRes.data,
		},
		{
			tableName: versionsTableRes.data,
		},
	);
	if (bricksQueryRes.error) return bricksQueryRes;
	if (bricksQueryRes.data === undefined) {
		return {
			error: {
				status: 404,
			},
			data: undefined,
		};
	}

	const relationIdRes = await extractRelatedEntityIds(context, {
		brickSchema: brickTablesRes.data,
		brickQuery: bricksQueryRes.data,
	});
	if (relationIdRes.error) return relationIdRes;

	console.log(relationIdRes.data);

	// TODO: loop over the custom fields and let them handle how relation data is fetched.
	// TODO: create a new formatter to marry the relation data to the brick rows and format the response to match the original implementation

	const relatedDataPromises = [];
	if (relationIdRes.data.media) {
		relatedDataPromises.push();
	}

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
