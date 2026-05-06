import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../libs/formatters/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices, documentVersionServices } from "../index.js";

const restoreRevision: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			userId: number;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const Documents = new DocumentsRepository(
		context.db.client,
		context.config.db,
	);

	const collectionRes = collectionServices.getSingleInstance(context, {
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

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const documentRes = await Documents.selectSingle(
		{
			select: ["id", "is_deleted"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.documentId,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					message: T("document_not_found_message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.document,
		},
	);
	if (documentRes.error) return documentRes;

	if (formatter.formatBoolean(documentRes.data.is_deleted)) {
		return {
			error: {
				type: "basic",
				message: T("cannot_restore_revision_for_deleted_document"),
				status: 400,
			},
			data: undefined,
		};
	}

	const response = await documentVersionServices.promoteVersion(context, {
		documentId: data.documentId,
		collectionKey: data.collectionKey,
		fromVersionId: data.versionId,
		toVersionType: "latest",
		userId: data.userId,
		skipRevisionCheck: true,
	});
	if (response.error) return response;

	return {
		error: undefined,
		data: undefined,
	};
};

export default restoreRevision;
