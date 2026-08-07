import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDocumentBricks from "../documents-bricks/get-multiple.js";
import prepareDuplicateContent from "./helpers/prepare-duplicate-content.js";
import upsertSingle from "./upsert-single.js";

/**
 * Creates a new document from the persisted latest version of an active source
 * document. The new document is passed through the normal create pipeline.
 */
const duplicateSingle: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const Documents = new DocumentsRepository(context.db);
	const sourceDocumentRes = await Documents.selectSingleById(
		{
			id: data.documentId,
			version: "latest",
			tables: {
				versions: tableNamesRes.data.version,
			},
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
	if (sourceDocumentRes.error) return sourceDocumentRes;

	if (formatter.formatBoolean(sourceDocumentRes.data.is_deleted)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const sourceVersionId = sourceDocumentRes.data.version_id;
	if (!sourceVersionId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.version.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const sourceContentRes = await getDocumentBricks(context, {
		versionId: sourceVersionId,
		collectionKey: data.collectionKey,
		versionType: "latest",
		includeRefs: false,
	});
	if (sourceContentRes.error) return sourceContentRes;
	const sourceContent = prepareDuplicateContent(sourceContentRes.data);

	return upsertSingle(context, {
		collectionKey: data.collectionKey,
		userId: data.userId,
		bricks: sourceContent.bricks,
		fields: sourceContent.fields,
		origin: {
			type: "duplicate",
			sourceDocumentId: data.documentId,
			sourceVersionId,
			sourceVersionType: "latest",
		},
	});
};

export default duplicateSingle;
