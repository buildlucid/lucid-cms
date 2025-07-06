import T from "../../translations/index.js";
import collectionsServices from "../collections/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";
import fetchRelationData from "./helpers/fetch-relation-data.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { BrickResponse, FieldResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

/**
 * Returns all of the bricks and collection fields
 */
const getMultiple: ServiceFn<
	[
		{
			versionId: number;
			collectionKey: string;
			/** The version type to use for any custom field document references  */
			versionType: Exclude<DocumentVersionType, "revision">;
			/** When enabled, only fetches from the `document-fields` table */
			documentFieldsOnly?: boolean;
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

	const collectionRes = collectionsServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const bricksQueryRes = await DocumentBricks.selectMultipleByVersionId(
		{
			versionId: data.versionId,
			bricksSchema: bricksTableSchemaRes.data.filter((t) => {
				if (data.documentFieldsOnly) return t.type === "document-fields";
				return true;
			}),
		},
		{
			tableName: tableNameRes.data.version,
		},
	);
	if (bricksQueryRes.error) return bricksQueryRes;

	if (bricksQueryRes.data === undefined) {
		return {
			error: {
				status: 404,
				message: T("document_version_not_found_message"),
			},
			data: undefined,
		};
	}

	const relationIdRes = await extractRelatedEntityIds(context, {
		brickSchema: bricksTableSchemaRes.data,
		responses: [bricksQueryRes.data],
	});
	if (relationIdRes.error) return relationIdRes;

	const relationDataRes = await fetchRelationData(context, {
		values: relationIdRes.data,
		versionType: data.versionType,
	});
	if (relationDataRes.error) return relationDataRes;

	return {
		error: undefined,
		data: {
			bricks: DocumentBricksFormatter.formatMultiple({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: bricksTableSchemaRes.data,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
			fields: DocumentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: bricksTableSchemaRes.data,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
		},
	};
};

export default getMultiple;
