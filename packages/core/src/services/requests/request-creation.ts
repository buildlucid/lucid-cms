import type { RichTextJSON } from "@lucidcms/rich-text";
import constants from "../../constants/constants.js";
import collections from "../../libs/collection/collections.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import hasAccess from "../../libs/permission/has-access.js";
import {
	DocumentVersionsRepository,
	RequestDocumentsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import saveDocument from "../documents/helpers/save-document.js";
import createTargets from "./helpers/create-targets.js";
import notifyMentions from "./helpers/notify-mentions.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import setReviewers from "./helpers/set-reviewers.js";

/**
 * Requests a new document through a create request. The document's content
 * is saved as the request's proposal, so it stays out of document lists and
 * content until the request is approved and completed into latest. Callers
 * own the transaction.
 */
const requestCreation: ServiceFn<
	[
		{
			collectionKey: string;
			title: string;
			description?: RichTextJSON | null;
			reviewerIds?: number[];
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
			user: LucidActor;
			agentRunId?: string;
		},
	],
	{ id: number; requestId: number; versionId: number }
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
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

	const descriptionRes = data.description
		? await resolveMentions(context, {
				request: { documents: [{ collection_key: data.collectionKey }] },
				body: data.description,
			})
		: undefined;
	if (descriptionRes?.error) return descriptionRes;

	const now = new Date().toISOString();
	const requestRes = await Requests.createSingle({
		data: {
			type: "create",
			title: data.title,
			description: descriptionRes?.data ?? null,
			status: "open",
			revision: 1,
			created_by: data.user.id,
			created_by_run_id: data.agentRunId ?? null,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (requestRes.error) return requestRes;

	const documentRes = await saveDocument(context, {
		collectionKey: data.collectionKey,
		userId: data.user.id,
		authUser: data.user,
		agentRunId: data.agentRunId,
		bricks: data.bricks,
		fields: data.fields,
		createRequestId: requestRes.data.id,
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
			request_id: requestRes.data.id,
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

	if (data.reviewerIds?.length) {
		const reviewersRes = await setReviewers(context, {
			request: {
				id: requestRes.data.id,
				type: "create",
				title: data.title,
				created_by: data.user.id,
				documents: [{ collection_key: data.collectionKey }],
				reviewers: [],
			},
			reviewerIds: data.reviewerIds,
			userId: data.user.id,
		});
		if (reviewersRes.error) return reviewersRes;
	}

	if (descriptionRes?.data) {
		const mentionsRes = await notifyMentions(context, {
			request: { id: requestRes.data.id, title: data.title },
			body: descriptionRes.data,
			actorUserId: data.user.id,
		});
		if (mentionsRes.error) return mentionsRes;
	}

	return {
		error: undefined,
		data: {
			id: documentRes.data,
			requestId: requestRes.data.id,
			versionId: proposalRes.data.id,
		},
	};
};

export default requestCreation;
