import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type z from "zod";
import type { ServiceFn } from "../../utils/services/types.js";
import type documentsSchema from "../../schemas/documents.js";
import type { DocumentVersionType } from "../../libs/db/types.js";
import type { DocumentResponse } from "../../types.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			status?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: z.infer<typeof documentsSchema.getSingle.query>;
		},
	],
	DocumentResponse
> = async (context, data) => {
	const Document = Repository.get("documents", context.db, context.config.db);
	const DocumentFormatter = Formatter.get("documents");

	const collectionRes = context.services.collection.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNameRes = collectionRes.data.tableNames;
	if (tableNameRes.error) return tableNameRes;

	const documentRes = await Document.selectSingleById(
		{
			id: data.id,
			tables: {
				versions: tableNameRes.data.version,
			},
			status: data.status,
			versionId: data.versionId,
			validation: {
				enabled: true,
				defaultError: {
					message: T("document_version_not_found_message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNameRes.data.document,
		},
	);
	if (documentRes.error) return documentRes;

	const versionId =
		data.status !== undefined ? documentRes.data.version_id : data.versionId;
	const versionType =
		data.status !== undefined ? data.status : documentRes.data.version_type;

	if (!versionId || !versionType) {
		return {
			error: {
				type: "basic",
				message: T("document_version_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (data.query.include?.includes("bricks")) {
		const bricksRes =
			await context.services.collection.documentBricks.getMultiple(context, {
				versionId: versionId,
				collectionKey: documentRes.data.collection_key,
				//* if fetching a revision, we always default to the draft version so any sub-documents this may query due to the document custom field is always recent info
				versionType: versionType !== "revision" ? versionType : "draft",
			});
		if (bricksRes.error) return bricksRes;

		return {
			error: undefined,
			data: DocumentFormatter.formatSingle({
				document: documentRes.data,
				collection: collectionRes.data,
				bricks: bricksRes.data.bricks,
				fields: bricksRes.data.fields,
				config: context.config,
			}),
		};
	}

	return {
		error: undefined,
		data: DocumentFormatter.formatSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: [],
			fields: [],
			config: context.config,
		}),
	};
};

export default getSingle;
