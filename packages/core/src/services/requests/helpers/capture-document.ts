import constants from "../../../constants/constants.js";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { RequestType } from "../../../libs/db/tables/requests.js";
import executeHooks from "../../../libs/hooks/execute-hooks.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import {
	DocumentVersionsRepository,
	RequestDocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { RequestDocumentInput } from "../../../schemas/requests.js";
import type { LucidUser } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkDocumentAccess from "../../documents/checks/check-document-access.js";
import acquireDocumentWrites from "../../documents/helpers/acquire-document-writes.js";
import cloneVersion from "../../documents-versions/clone-version.js";
import checkPublishedTargets from "./check-published-targets.js";
import createTargets from "./create-targets.js";
import requestTypePermissions from "./request-type-permissions.js";
import resolveTargets from "./resolve-targets.js";

/** Adds a document's targets to a request and captures its source content for publish requests. */
const captureDocument: ServiceFn<
	[
		RequestDocumentInput & {
			request: { id: number; type: Exclude<RequestType, "create"> };
			user: LucidUser;
			/** Callers that already hold the document's write claim. */
			skipDocumentWriteClaims?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Versions = new DocumentVersionsRepository(context.db);
	const RequestDocuments = new RequestDocumentsRepository(context.db);

	const { write, ownWrite } = requestTypePermissions[data.request.type];
	if (
		!hasAccess({
			user: data.user,
			requiredPermissions: [
				getCollectionPermission(data.collectionKey, "read"),
			],
			optionalPermissions: [
				getCollectionPermission(data.collectionKey, write),
				...(ownWrite
					? [getCollectionPermission(data.collectionKey, ownWrite)]
					: []),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.item.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const source = data.source ?? null;
	if ((data.request.type === "publish") !== (source !== null)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.item.source.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const targetsRes = resolveTargets({
		collection: collectionRes.data,
		type: data.request.type,
		source,
		targets: data.targets ?? [],
	});
	if (targetsRes.error) return targetsRes;

	await using claims = new AsyncDisposableStack();
	if (!data.skipDocumentWriteClaims) {
		const claimRes = await acquireDocumentWrites(context, {
			collectionKey: data.collectionKey,
			ids: [data.documentId],
		});
		if (claimRes.error) return claimRes;

		claims.use(claimRes.data);
	}

	const [accessRes, tablesRes] = await Promise.all([
		checkDocumentAccess(context, {
			collectionKey: data.collectionKey,
			id: data.documentId,
		}),
		getTableNames(context, data.collectionKey),
	]);
	if (accessRes.error) return accessRes;
	if (tablesRes.error) return tablesRes;

	if (source === null) {
		const publishedRes = await checkPublishedTargets(context, {
			collectionKey: data.collectionKey,
			documentId: data.documentId,
			targets: targetsRes.data,
		});
		if (publishedRes.error) return publishedRes;

		const documentRes = await RequestDocuments.createSingle({
			data: {
				request_id: data.request.id,
				collection_key: data.collectionKey,
				document_id: data.documentId,
				source: null,
				source_version_id: null,
				approved_version_id: null,
				approved_workflow_stage: null,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		if (documentRes.error) return documentRes;

		return createTargets(context, {
			requestDocumentId: documentRes.data.id,
			targets: targetsRes.data,
		});
	}

	const sourceRes = await Versions.selectSingle(
		{
			select: ["id"],
			where: [
				{ key: "document_id", operator: "=", value: data.documentId },
				{ key: "type", operator: "=", value: source },
			],
		},
		{ tableName: tablesRes.data.version },
	);
	if (sourceRes.error) return sourceRes;

	if (!sourceRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.item.source.missing"),
				status: 404,
			},
			data: undefined,
		};
	}

	const cloneRes = await cloneVersion(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		fromVersionId: sourceRes.data.id,
		toVersionType:
			source === "latest"
				? constants.collectionBuilder.publishing.proposalVersionType
				: constants.collectionBuilder.publishing.snapshotVersionType,
		userId: data.user.id,
	});
	if (cloneRes.error) return cloneRes;

	const documentRes = await RequestDocuments.createSingle({
		data: {
			request_id: data.request.id,
			collection_key: data.collectionKey,
			document_id: data.documentId,
			source,
			source_version_id: cloneRes.data.versionId,
			approved_version_id: null,
			approved_workflow_stage: null,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (documentRes.error) return documentRes;

	const targetsCreateRes = await createTargets(context, {
		requestDocumentId: documentRes.data.id,
		targets: targetsRes.data,
	});
	if (targetsCreateRes.error) return targetsCreateRes;

	const membersRes = await RequestDocuments.selectMultiple({
		select: ["collection_key", "document_id", "source", "source_version_id"],
		where: [{ key: "request_id", operator: "=", value: data.request.id }],
	});
	if (membersRes.error) return membersRes;

	return executeHooks(
		context,
		{
			service: "documents",
			event: "versionCapture",
			config: context.config,
			collectionInstance: collectionRes.data,
		},
		{
			meta: {
				collection: collectionRes.data,
				collectionKey: data.collectionKey,
				userId: data.user.id,
				collectionTableNames: tablesRes.data,
				request: {
					id: data.request.id,
					documents: (membersRes.data ?? []).flatMap((member) =>
						member.source === null || member.source_version_id === null
							? []
							: [
									{
										collectionKey: member.collection_key,
										documentId: member.document_id,
										source: member.source,
										versionId: member.source_version_id,
									},
								],
					),
				},
			},
			data: {
				documentId: data.documentId,
				versionId: cloneRes.data.versionId,
				versionType:
					cloneRes.data.sourceVersionType === "latest"
						? constants.collectionBuilder.publishing.proposalVersionType
						: constants.collectionBuilder.publishing.snapshotVersionType,
				sourceVersionId: sourceRes.data.id,
				sourceVersionType: source,
			},
		},
	);
};

export default captureDocument;
