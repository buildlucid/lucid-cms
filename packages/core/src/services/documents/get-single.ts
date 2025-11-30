import T from "../../translations/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import { documentsFormatter } from "../../libs/formatters/index.js";
import { getTableNames } from "../../libs/collection/schema/live/schema-filters.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { DocumentVersionType } from "../../libs/db-adapter/types.js";
import type { DocumentResponse } from "../../types.js";
import type { GetSingleQueryParams } from "../../schemas/documents.js";
import { collectionServices, documentBrickServices } from "../index.js";

const getSingle: ServiceFn<
	[
		{
			id: number;
			status?: DocumentVersionType;
			versionId?: number;
			collectionKey: string;
			query: GetSingleQueryParams;
		},
	],
	DocumentResponse
> = async (context, data) => {
	const Document = new DocumentsRepository(context.db, context.config.db);

	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const documentRes = await Document.selectSingleById(
		{
			id: data.id,
			tables: {
				versions: tableNamesRes.data.version,
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
			tableName: tableNamesRes.data.document,
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
		const bricksRes = await documentBrickServices.getMultiple(context, {
			versionId: versionId,
			collectionKey: documentRes.data.collection_key,
			//* if fetching a revision, we always default to the latest version so any sub-documents this may query due to the document custom field is always recent info
			versionType: versionType !== "revision" ? versionType : "latest",
		});
		if (bricksRes.error) return bricksRes;

		return {
			error: undefined,
			data: documentsFormatter.formatSingle({
				document: documentRes.data,
				collection: collectionRes.data,
				bricks: bricksRes.data.bricks,
				fields: bricksRes.data.fields,
				config: context.config,
				refs: bricksRes.data.refs,
			}),
		};
	}

	return {
		error: undefined,
		data: documentsFormatter.formatSingle({
			document: documentRes.data,
			collection: collectionRes.data,
			bricks: [],
			fields: [],
			config: context.config,
		}),
	};
};

export default getSingle;
