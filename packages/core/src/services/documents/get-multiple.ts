import { DocumentsRepository } from "../../libs/repositories/index.js";
import formatter, { documentsFormatter } from "../../libs/formatters/index.js";
import { groupDocumentFilters } from "../../utils/helpers/index.js";
import extractRelatedEntityIds from "../documents-bricks/helpers/extract-related-entity-ids.js";
import fetchRelationData from "../documents-bricks/helpers/fetch-relation-data.js";
import {
	getBricksTableSchema,
	getDocumentFieldsTableSchema,
	getTableNames,
} from "../../libs/collection/schema/live/schema-filters.js";
import type { GetMultipleQueryParams } from "../../schemas/documents.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { DocumentResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db-adapter/types.js";
import { collectionServices } from "../index.js";

const getMultiple: ServiceFn<
	[
		{
			collectionKey: string;
			status: DocumentVersionType;
			query: GetMultipleQueryParams;
		},
	],
	{
		data: DocumentResponse[];
		count: number;
	}
> = async (context, data) => {
	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const Document = new DocumentsRepository(context.db, context.config.db);

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const documentFieldsTableSchemaRes = await getDocumentFieldsTableSchema(
		context,
		data.collectionKey,
	);
	if (documentFieldsTableSchemaRes.error) return documentFieldsTableSchemaRes;

	const { documentFilters, brickFilters } = groupDocumentFilters(
		bricksTableSchemaRes.data,
		data.query.filter,
	);

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const documentsRes = await Document.selectMultipleFiltered(
		{
			status: data.status,
			query: data.query,
			documentFilters,
			brickFilters: brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: data.status !== "revision" ? data.status : "latest",
			tables: {
				versions: tableNameRes.data.version,
				documentFields: tableNameRes.data.documentFields,
			},
			documentFieldsTableSchema: documentFieldsTableSchemaRes.data,
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	const relationIdRes = await extractRelatedEntityIds(context, {
		brickSchema: bricksTableSchemaRes.data,
		responses: documentsRes.data?.[0] ?? [],
	});
	if (relationIdRes.error) return relationIdRes;

	const relationDataRes = await fetchRelationData(context, {
		values: relationIdRes.data,
		versionType: data.status !== "revision" ? data.status : "latest",
	});
	if (relationDataRes.error) return relationDataRes;

	return {
		error: undefined,
		data: {
			data: documentsFormatter.formatMultiple({
				documents: documentsRes.data?.[0] || [],
				collection: collectionRes.data,
				config: context.config,
				relationData: relationDataRes.data,
				hasFields: true,
				hasBricks: false,
				bricksTableSchema: bricksTableSchemaRes.data,
			}),
			count: formatter.parseCount(documentsRes.data?.[1]?.count),
		},
	};
};

export default getMultiple;
