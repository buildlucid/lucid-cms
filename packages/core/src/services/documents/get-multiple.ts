import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import { groupDocumentFilters } from "../../utils/helpers/index.js";
import extractRelatedEntityIds from "../documents-bricks/helpers/extract-related-entity-ids.js";
import fetchRelationData from "../documents-bricks/helpers/fetch-relation-data.js";
import type { GetMultipleQueryParams } from "../../schemas/documents.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { DocumentResponse } from "../../types/response.js";
import type { DocumentVersionType } from "../../libs/db/types.js";

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
	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const Document = Repository.get("documents", context.db, context.config.db);
	const DocumentFormatter = Formatter.get("documents");

	const { documentFilters, brickFilters } = groupDocumentFilters(
		collectionRes.data.bricksTableSchema,
		data.query.filter,
	);

	const tableNameRes = collectionRes.data.tableNames;
	if (tableNameRes.error) return tableNameRes;

	const documentsRes = await Document.selectMultipleFiltered(
		{
			status: data.status,
			query: data.query,
			documentFilters,
			brickFilters: brickFilters,
			collection: collectionRes.data,
			config: context.config,
			relationVersionType: data.status !== "revision" ? data.status : "draft",
			tables: {
				versions: tableNameRes.data.version,
				documentFields: tableNameRes.data.documentFields,
			},
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentsRes.error) return documentsRes;

	const relationIdRes = await extractRelatedEntityIds(context, {
		brickSchema: collectionRes.data.bricksTableSchema,
		responses: documentsRes.data?.[0] ?? [],
		excludeTypes: ["document"],
	});
	if (relationIdRes.error) return relationIdRes;

	const relationDataRes = await fetchRelationData(context, {
		values: relationIdRes.data,
		versionType: data.status !== "revision" ? data.status : "draft",
	});
	if (relationDataRes.error) return relationDataRes;

	return {
		error: undefined,
		data: {
			data: DocumentFormatter.formatMultiple({
				documents: documentsRes.data?.[0] || [],
				collection: collectionRes.data,
				config: context.config,
				relationData: relationDataRes.data,
				hasFields: true,
				hasBricks: false,
			}),
			count: Formatter.parseCount(documentsRes.data?.[1]?.count),
		},
	};
};

export default getMultiple;
