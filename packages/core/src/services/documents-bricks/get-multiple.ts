import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../libs/db-adapter/types.js";
import {
	documentBricksFormatter,
	documentsFormatter,
} from "../../libs/formatters/index.js";
import { DocumentBricksRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type {
	InternalCollectionDocument,
	InternalDocumentBrick,
	InternalDocumentField,
} from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { getSingleInstance } from "../collections/index.js";
import extractRelatedEntityIds from "./helpers/extract-related-entity-ids.js";
import fetchRefData from "./helpers/fetch-ref-data.js";

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
		bricks: Array<InternalDocumentBrick>;
		fields: Array<InternalDocumentField>;
		refs: InternalCollectionDocument["refs"];
	}
> = async (context, data) => {
	const DocumentBricks = new DocumentBricksRepository(
		context.db.client,
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
		collection: collectionRes.data,
		brickSchema: bricksTableSchemaRes.data,
		responses: [bricksQueryRes.data],
	});
	if (relationIdRes.error) return relationIdRes;

	const refDataRes = await fetchRefData(context, {
		values: relationIdRes.data,
		versionType: data.versionType,
	});
	if (refDataRes.error) return refDataRes;

	const baseUrl = getBaseUrl(context);

	return {
		error: undefined,
		data: {
			bricks: documentBricksFormatter.formatMultiple({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: bricksTableSchemaRes.data,
				refData: refDataRes.data,
				collection: collectionRes.data,
				config: context.config,
				host: baseUrl,
			}),
			fields: documentBricksFormatter.formatDocumentFields({
				bricksQuery: bricksQueryRes.data,
				bricksSchema: bricksTableSchemaRes.data,
				refData: refDataRes.data,
				collection: collectionRes.data,
				config: context.config,
				host: baseUrl,
			}),
			refs: documentsFormatter.formatRefs({
				collection: collectionRes.data,
				config: context.config,
				host: baseUrl,
				bricksTableSchema: bricksTableSchemaRes.data,
				data: refDataRes.data,
			}),
		},
	};
};

export default getMultiple;
