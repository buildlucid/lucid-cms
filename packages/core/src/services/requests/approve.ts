import type { RichTextJSON } from "@lucidcms/rich-text";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	RequestApprovalsRepository,
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestsRepository,
	RequestTargetsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import cloneVersion from "../documents-versions/clone-version.js";
import validateVersionContent from "../documents-versions/helpers/validate-version-content.js";
import resolveNotification from "../notifications/resolve.js";
import sendNotification from "../notifications/send.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import addReviewer from "./helpers/add-reviewer.js";
import deleteVersions from "./helpers/delete-versions.js";
import getBlockers from "./helpers/get-blockers.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestState from "./helpers/get-request-state.js";
import getRequiredApprovals from "./helpers/get-required-approvals.js";
import getReviewToken from "./helpers/get-review-token.js";
import scheduleRequest from "./helpers/schedule-request.js";
import { approvedNotification } from "./notifications/approved.js";
import { failedNotification } from "./notifications/failed.js";
import { requestNotificationKeys } from "./notifications/keys.js";
import { readyNotification } from "./notifications/ready.js";
import { reviewRequestedNotification } from "./notifications/review-requested.js";

/**
 * Records the user's approval and freezes content or target versions once the
 * required count is reached. `ifUnchanged` is the `reviewToken` the user
 * reviewed, so changes made since then are never approved.
 */
const approve: ServiceFn<
	[
		{
			id: number;
			user: LucidUser;
			agentRunId?: string;
			body?: RichTextJSON;
			ifUnchanged: string;
		},
	],
	undefined
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const Requests = new RequestsRepository(context.db);
	const RequestTargets = new RequestTargetsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);
	const RequestApprovals = new RequestApprovalsRepository(context.db);

	const claimRes = await acquireRequestWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const request = claimRes.data.request;
	if (!getRequestAccess(context, { request, user: data.user }).approve) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (request.approved_revision === request.revision) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.already.approved"),
				status: 409,
			},
			data: undefined,
		};
	}

	const requiredApprovals = getRequiredApprovals(
		context,
		request.documents.map((document) => document.collection_key),
	);
	//* an earlier approval can still approve the request if its collections now need fewer
	const approvedBefore = request.approvals.some(
		(approval) => approval.user_id === data.user.id,
	);
	if (approvedBefore && request.approvals.length < requiredApprovals) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.approval.given"),
				status: 409,
			},
			data: undefined,
		};
	}

	const stateRes = await getRequestState(context, { request });
	if (stateRes.error) return stateRes;

	const states = stateRes.data;
	if (getReviewToken({ request, state: states }) !== data.ifUnchanged) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.review.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	const blockersRes = await getBlockers(context, { request, state: states });
	if (blockersRes.error) return blockersRes;
	if (blockersRes.data.length > 0) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.blocked"),
				status: 409,
			},
			data: undefined,
		};
	}

	for (const document of request.documents) {
		const state = states.get(document.id);
		if (!state?.collection || (document.source !== null && !state.source)) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.blocked"),
					status: 409,
				},
				data: undefined,
			};
		}
		if (!state.source) continue;

		const validateRes = await validateVersionContent(context, {
			collection: state.collection,
			documentId: document.document_id,
			versionId: state.source.id,
			user: data.user,
		});
		if (validateRes.error) return validateRes;
	}

	if (!approvedBefore) {
		const approvalRes = await RequestApprovals.createSingle({
			data: {
				request_id: request.id,
				user_id: data.user.id,
				revision: request.revision,
			},
		});
		if (approvalRes.error) return approvalRes;

		const reviewerRes = await addReviewer(context, {
			request,
			userId: data.user.id,
		});
		if (reviewerRes.error) return reviewerRes;
	}

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: request.id,
				user_id: data.user.id,
				agent_run_id: data.agentRunId ?? null,
				type: "approved",
				body: data.body ?? null,
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	const reviewDoneRes = await resolveNotification(context, {
		definition: reviewRequestedNotification,
		key: requestNotificationKeys.review(request.id, data.user.id),
	});
	if (reviewDoneRes.error) return reviewDoneRes;

	const approvedRes = await sendNotification(context, {
		definition: approvedNotification,
		recipients: request.created_by === null ? [] : [request.created_by],
		actorUserId: data.user.id,
		actorRunId: data.agentRunId,
		data: { requestId: request.id, title: request.title },
	});
	if (approvedRes.error) return approvedRes;

	const approvals = request.approvals.length + (approvedBefore ? 0 : 1);
	if (approvals < requiredApprovals) {
		return { error: undefined, data: undefined };
	}

	for (const document of request.documents) {
		const state = states.get(document.id);
		if (!state) continue;

		let approvedVersionId = state.source?.id ?? null;
		if (document.source === "latest" && state.source) {
			const snapshotRes = await cloneVersion(context, {
				collectionKey: document.collection_key,
				documentId: document.document_id,
				fromVersionId: state.source.id,
				toVersionType:
					constants.collectionBuilder.publishing.snapshotVersionType,
				userId: data.user.id,
				agentRunId: data.agentRunId,
			});
			if (snapshotRes.error) return snapshotRes;

			approvedVersionId = snapshotRes.data.versionId;
		}

		for (const target of document.targets) {
			const targetRes = await RequestTargets.updateSingle({
				data: {
					approved_version_id: state.versions.get(target.target)?.id ?? null,
				},
				where: [{ key: "id", operator: "=", value: target.id }],
			});
			if (targetRes.error) return targetRes;
		}

		const documentRes = await RequestDocuments.updateSingle({
			data: {
				approved_version_id: approvedVersionId,
				approved_workflow_stage: state.workflowStage,
			},
			where: [{ key: "id", operator: "=", value: document.id }],
		});
		if (documentRes.error) return documentRes;

		//* a snapshot from an earlier approval is no longer needed
		if (
			document.approved_version_id !== null &&
			document.approved_version_id !== document.source_version_id &&
			document.approved_version_id !== approvedVersionId
		) {
			const previousRes = await deleteVersions(context, {
				collectionKey: document.collection_key,
				documentId: document.document_id,
				versionIds: [document.approved_version_id],
			});
			if (previousRes.error) return previousRes;
		}
	}

	const updateRes = await Requests.updateSingle({
		data: {
			approved_revision: request.revision,
			failure: null,
			failure_request_document_id: null,
			failure_target: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: request.id }],
	});
	if (updateRes.error) return updateRes;

	const scheduleRes = await scheduleRequest(context, {
		id: request.id,
		skipRequestWriteClaim: true,
	});
	if (scheduleRes.error) return scheduleRes;

	const failedRes = await resolveNotification(context, {
		definition: failedNotification,
		key: requestNotificationKeys.failed(request.id),
	});
	if (failedRes.error) return failedRes;

	const readyRes = await sendNotification(context, {
		definition: readyNotification,
		key: requestNotificationKeys.ready(request.id),
		recipients: request.created_by === null ? [] : [request.created_by],
		actorUserId: data.user.id,
		actorRunId: data.agentRunId,
		data: {
			requestId: request.id,
			title: request.title,
			scheduled: request.scheduled_at !== null,
		},
	});
	if (readyRes.error) return readyRes;

	return { error: undefined, data: undefined };
};

export default approve;
