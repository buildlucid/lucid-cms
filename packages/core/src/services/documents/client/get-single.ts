import T from "../../../translations/index.js";
import Repository from "../../../libs/repositories/index.js";
import Formatter from "../../../libs/formatters/index.js";
import { groupDocumentFilters } from "../../../utils/helpers/index.js";
import type z from "zod";
import type { ServiceFn } from "../../../utils/services/types.js";
import type documentsSchema from "../../../schemas/documents.js";
import type { ClientDocumentResponse } from "../../../types/response.js";
import type { DocumentVersionType } from "../../../libs/db/types.js";

const getSingle: ServiceFn<
	[
		{
			collectionKey: string;
			status: Exclude<DocumentVersionType, "revision">;
			query: z.infer<typeof documentsSchema.client.getSingle.query>;
		},
	],
	ClientDocumentResponse
> = async (context, data) => {
	const Documents = Repository.get("documents", context.db, context.config.db);
	const DocumentsFormatter = Formatter.get("documents");

	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNameRes = collectionRes.data.tableNames;
	if (tableNameRes.error) return tableNameRes;

	const { documentFilters, brickFilters } = groupDocumentFilters(
		collectionRes.data.bricksTableSchema,
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

	const bricksRes =
		await context.services.collection.documentBricks.getMultiple(context, {
			versionId: documentRes.data.version_id,
			collectionKey: collectionRes.data.key,
			versionType: data.status,
			documentFieldsOnly: !data.query.include?.includes("bricks"),
		});
	if (bricksRes.error) return bricksRes;

	return {
		error: undefined,
		data: DocumentsFormatter.formatClientSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: bricksRes.data.bricks,
			fields: bricksRes.data.fields,
			config: context.config,
		}),
	};
};

export default getSingle;
