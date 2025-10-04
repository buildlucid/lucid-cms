import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/live/schema-filters.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { DocumentVersionResponse } from "../../types/response.js";
import type { GetMultipleRevisionsQueryParams } from "../../schemas/documents.js";
import services from "../index.js";

const getMultipleRevisions: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			query: GetMultipleRevisionsQueryParams;
		},
	],
	{
		data: DocumentVersionResponse[];
		count: number;
	}
> = async (context, data) => {
	const collectionRes = services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.config.useRevisions === false) {
		return {
			error: {
				type: "basic",
				name: T("revisions_not_enabled_error_name"),
				message: T("revisions_not_enabled_message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const VersionsRepo = Repository.get(
		"document-versions",
		context.db,
		context.config.db,
	);
	const VersionsFormatter = Formatter.get("document-versions");

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collectionKey,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	const tableNameRes = await getTableNames(context, data.collectionKey);
	if (tableNameRes.error) return tableNameRes;

	const bricksSchema = bricksTableSchemaRes.data.filter(
		(s) => s.type === "brick",
	);

	const revisionsRes = await VersionsRepo.selectMultipleRevisions(
		{
			documentId: data.documentId,
			query: data.query,
			tables: {
				document: tableNameRes.data.document,
			},
			bricksSchema: bricksSchema,
		},
		{
			tableName: tableNameRes.data.version,
		},
	);
	if (revisionsRes.error) return revisionsRes;

	return {
		error: undefined,
		data: {
			data: VersionsFormatter.formatMultiple({
				versions: revisionsRes.data?.[0] || [],
				bricksSchema: bricksSchema,
			}),
			count: Formatter.parseCount(revisionsRes.data?.[1]?.count),
		},
	};
};

export default getMultipleRevisions;
