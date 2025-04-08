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
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";
import fetchRelationData from "./helpers/fetch-relation-data.js";

/**
 * Returns all of the bricks and collection fields
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
	{
		bricks: Array<BrickResponse>;
		fields: Array<FieldResponse>;
	}
> = async (context, data) => {
	const DocumentBricks = Repository.get(
		"document-bricks",
		context.db,
		context.config.db,
	);
	const DocumentBricksFormatter = Formatter.get("document-bricks");

	const versionsTableRes = buildTableName<LucidVersionTableName>("versions", {
		collection: data.collectionKey,
	});
	if (versionsTableRes.error) return versionsTableRes;

	const collectionRes = collectionsServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const targetVersionType = data.versionType ?? "draft";

	const bricksQueryRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionType: targetVersionType,
			versionId: data.versionId,
			bricksSchema: collectionRes.data.bricksTableSchema,
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
		brickSchema: collectionRes.data.bricksTableSchema,
		brickQuery: bricksQueryRes.data,
	});
	if (relationIdRes.error) return relationIdRes;

	const relationDataRes = await fetchRelationData(context, {
		values: relationIdRes.data,
		versionType: targetVersionType,
	});
	if (relationDataRes.error) return relationDataRes;

	return {
		error: undefined,
		data: {
			bricks: DocumentBricksFormatter.formatMultiple({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: collectionRes.data.bricksTableSchema,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
			fields: DocumentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: collectionRes.data.bricksTableSchema,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
		},
	};
};

export default getMultiple;
