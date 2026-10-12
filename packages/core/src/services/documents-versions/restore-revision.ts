import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	DocumentsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkDocumentAccess from "../documents/checks/check-document-access.js";
import promoteVersion from "./promote-version.js";

/** Restores a document's own revision to latest, excluding request proposals and snapshots. */
const restoreRevision: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			userId: number | null;
			collectionKey: string;
		},
	],
	undefined
> = async (context, data) => {
	const Documents = new DocumentsRepository(context.db);
	const Versions = new DocumentVersionsRepository(context.db);

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;
	if (collectionRes.data.getData.revisions.enabled === false) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.documents.revisions.not.enabled.error.name"),
				message: copy("server:core.documents.revisions.not.enabled.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const documentAccessRes = await checkDocumentAccess(context, {
		collectionKey: data.collectionKey,
		id: data.documentId,
		pending: false,
	});
	if (documentAccessRes.error) return documentAccessRes;

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
					message: copy("server:core.documents.not.found.message"),
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
				message: copy(
					"server:core.documents.revisions.restore.deleted.document",
				),
				status: 400,
			},
			data: undefined,
		};
	}

	const versionRes = await Versions.selectSingle(
		{
			select: ["id"],
			where: [
				{ key: "id", operator: "=", value: data.versionId },
				{ key: "document_id", operator: "=", value: data.documentId },
				{ key: "type", operator: "=", value: "revision" },
			],
			validation: {
				enabled: true,
				defaultError: {
					message: copy("server:core.documents.version.not.found.message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (versionRes.error) return versionRes;

	const response = await promoteVersion(context, {
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
