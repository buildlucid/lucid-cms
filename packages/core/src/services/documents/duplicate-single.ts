import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import formatter from "../../libs/formatters/index.js";
import type { DocumentBeforeUpsertHookOrigin } from "../../libs/hooks/types.js";
import { copy } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import { DocumentsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDocumentBricks from "../documents-bricks/get-multiple.js";
import createRequest, {
	type RequestDetailsInput,
} from "../requests/create-single.js";
import prepareDuplicateContent from "./helpers/prepare-duplicate-content.js";
import upsertSingle from "./upsert-single.js";

/**
 * Creates a new document from the persisted latest version of an active source
 * document, through the normal create pipeline. With `request`, the copy opens a
 * create request instead, which collections that review new documents require.
 */
const duplicateSingle: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			user: LucidActor;
			/** Opens a create request with the copy instead, which collections that review new documents require. */
			request?: RequestDetailsInput;
		},
	],
	{ id: number; requestId: number | null }
> = async (context, data) => {
	const create = getCollectionPermission(data.collectionKey, "create");
	if (
		!hasAccess({
			user: data.user,
			optionalPermissions: data.request
				? [
						create,
						getCollectionPermission(data.collectionKey, "create-request"),
					]
				: [create],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.permission.error.message", {
					data: { collection: data.collectionKey, action: "create" },
				}),
				status: 403,
			},
			data: undefined,
		};
	}

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
		refResources: null,
	});
	if (sourceContentRes.error) return sourceContentRes;

	const sourceContent = prepareDuplicateContent(sourceContentRes.data);
	const origin: DocumentBeforeUpsertHookOrigin = {
		type: "duplicate",
		sourceDocumentId: data.documentId,
		sourceVersionId,
		sourceVersionType: "latest",
	};

	if (data.request) {
		const requestRes = await createRequest(context, {
			type: "create",
			title: data.request.title,
			description: data.request.description,
			reviewerIds: data.request.reviewerIds,
			document: {
				collectionKey: data.collectionKey,
				bricks: sourceContent.bricks,
				fields: sourceContent.fields,
				origin,
			},
			user: data.user,
		});
		if (requestRes.error) return requestRes;

		return {
			error: undefined,
			data: { id: requestRes.data.document.id, requestId: requestRes.data.id },
		};
	}

	const createdRes = await upsertSingle(context, {
		collectionKey: data.collectionKey,
		userId: data.user.id,
		bricks: sourceContent.bricks,
		fields: sourceContent.fields,
		origin,
	});
	if (createdRes.error) return createdRes;

	return { error: undefined, data: { id: createdRes.data, requestId: null } };
};

export default duplicateSingle;
