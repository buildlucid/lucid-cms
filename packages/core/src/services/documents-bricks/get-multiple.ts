import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/live/schema-filters.js";
import type { DocumentVersionType } from "../../libs/db-adapter/types.js";
import { DocumentBricksRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import {
	documentBricksFormatter,
	documentsFormatter,
} from "../../libs/formatters/index.js";
import type {
	BrickResponse,
	FieldResponse,
	DocumentResponse,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getSingleInstance } from "../collections/index.js";
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";
import fetchRelationData from "./helpers/fetch-relation-data.js";

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
		refs: DocumentResponse["refs"];
	}
> = async (context, data) => {
	const DocumentBricks = new DocumentBricksRepository(
		context.db,
		context.config.db,
	);

	const collectionRes = getSingleInstance(context, {
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
			bricks: documentBricksFormatter.formatMultiple({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: bricksTableSchemaRes.data,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
			fields: documentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: bricksTableSchemaRes.data,
				relationMetaData: relationDataRes.data,
				collection: collectionRes.data,
				config: context.config,
			}),
			refs: documentsFormatter.formatRefs({
				collection: collectionRes.data,
				config: context.config,
				bricksTableSchema: bricksTableSchemaRes.data,
				data: relationDataRes.data,
			}),
		},
	};
};

export default getMultiple;
