import {
	getBricksTableSchema,
	getTableNames,
} from "../../../libs/collection/schema/live/schema-filters.js";
import type { DocumentVersionType } from "../../../libs/db-adapter/types.js";
import { documentsFormatter } from "../../../libs/formatters/index.js";
import { DocumentsRepository } from "../../../libs/repositories/index.js";
import type { ClientGetSingleQueryParams } from "../../../schemas/documents.js";
import T from "../../../translations/index.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import { groupDocumentFilters } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { collectionServices, documentBrickServices } from "../../index.js";

const getSingle: ServiceFn<
	[
		{
			collectionKey: string;
			status: Exclude<DocumentVersionType, "revision">;
			query: ClientGetSingleQueryParams;
		},
	],
	ClientDocumentResponse
> = async (context, data) => {
	const Documents = new DocumentsRepository(context.db, context.config.db);

	const collectionRes = collectionServices.getSingleInstance(context, {
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

	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		data.query.filter,
	);

	const documentRes = await Documents.selectSingleFiltered(
		{
			status: data.status,
			query: data.query,
			documentFilters,
			brickFilters: brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: data.status,
			tables: {
				versions: tableNameRes.data.version,
			},
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentRes.error) return documentRes;

	if (documentRes.data === undefined || !documentRes.data.version_id) {
		return {
			error: {
				message: T("document_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const bricksRes = await documentBrickServices.getMultiple(context, {
		versionId: documentRes.data.version_id,
		collectionKey: collectionRes.data.key,
		versionType: data.status,
		documentFieldsOnly: !data.query.include?.includes("bricks"),
	});
	if (bricksRes.error) return bricksRes;

	return {
		error: undefined,
		data: documentsFormatter.formatClientSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: bricksRes.data.bricks,
			fields: bricksRes.data.fields,
			config: context.config,
			refs: bricksRes.data.refs,
		}),
	};
};

export default getSingle;
