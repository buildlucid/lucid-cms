import constants from "../../../constants/constants.js";
import collections from "../../../libs/collection/collections.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import {
	DocumentVersionsRepository,
	RequestDocumentsRepository,
} from "../../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import saveDocument from "../../documents/helpers/save-document.js";
import createTargets from "./create-targets.js";

/**
 * Saves a new document as a create-request proposal with a latest target.
 * @remarks Document lists and content exclude it until completion promotes it to latest.
 */
const captureNewDocument: ServiceFn<
	[
		{
			collectionKey: string;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
			requestId: number;
			user: LucidActor;
			agentRunId?: string;
		},
	],
	{ id: number; versionId: number }
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const Versions = new DocumentVersionsRepository(context.db);

	if (
		!hasAccess({
			user: data.user,
			optionalPermissions: [
				getCollectionPermission(data.collectionKey, "create"),
				getCollectionPermission(data.collectionKey, "create-request"),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.create.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (collectionRes.data.getData.mode !== "multiple") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.create.collection"),
				status: 400,
			},
			data: undefined,
		};
	}

	const documentRes = await saveDocument(context, {
		collectionKey: data.collectionKey,
		userId: data.user.id,
		authUser: data.user,
		agentRunId: data.agentRunId,
		bricks: data.bricks,
		fields: data.fields,
		createRequestId: data.requestId,
	});
	if (documentRes.error) return documentRes;

	const tablesRes = await getTableNames(context, data.collectionKey);
	if (tablesRes.error) return tablesRes;

	const proposalRes = await Versions.selectSingle(
		{
			select: ["id"],
			where: [
				{ key: "document_id", operator: "=", value: documentRes.data },
				{
					key: "type",
					operator: "=",
					value: constants.collectionBuilder.publishing.proposalVersionType,
				},
			],
			validation: { enabled: true },
		},
		{ tableName: tablesRes.data.version },
	);
	if (proposalRes.error) return proposalRes;

	const requestDocumentRes = await RequestDocuments.createSingle({
		data: {
			request_id: data.requestId,
			collection_key: data.collectionKey,
			document_id: documentRes.data,
			source: "latest",
			source_version_id: proposalRes.data.id,
			approved_version_id: null,
			approved_workflow_stage: null,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (requestDocumentRes.error) return requestDocumentRes;

	const targetsRes = await createTargets(context, {
		requestDocumentId: requestDocumentRes.data.id,
		targets: ["latest"],
	});
	if (targetsRes.error) return targetsRes;

	return {
		error: undefined,
		data: { id: documentRes.data, versionId: proposalRes.data.id },
	};
};

export default captureNewDocument;
