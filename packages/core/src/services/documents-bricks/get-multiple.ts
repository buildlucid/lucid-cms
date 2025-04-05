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
import inferBricksTableSchema from "../collection-migrator/helpers/infer-bricks-table-schema.js";
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";
import fetchRelationData from "./helpers/fetch-relation-data.js";

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

	const collectionRes = await collectionsServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const bricksSchemaRes = inferBricksTableSchema(
		collectionRes.data,
		context.config.db,
	);
	if (bricksSchemaRes.error) return bricksSchemaRes;

	const bricksQueryRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionType: data.versionType ?? "draft",
			versionId: data.versionId,
			bricksSchema: bricksSchemaRes.data,
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
		brickSchema: bricksSchemaRes.data,
		brickQuery: bricksQueryRes.data,
	});
	if (relationIdRes.error) return relationIdRes;

	const relationDataRes = await fetchRelationData(context, {
		values: relationIdRes.data,
	});
	if (relationDataRes.error) return relationDataRes;

	return {
		error: undefined,
		data: {
			bricks: DocumentBricksFormatter.formatMultiple({
				bricksQuery: bricksQueryRes.data,
				brickSchema: bricksSchemaRes.data,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
			fields: DocumentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				brickSchema: bricksSchemaRes.data,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
		},
	};
};

export default getMultiple;
