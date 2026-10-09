import { copy } from "../../libs/i18n/index.js";
import {
	RequestEventsRepository,
	RequestsRepository,
	RequestTargetsRepository,
} from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import canEditDocument from "./helpers/can-edit-document.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestState from "./helpers/get-request-state.js";

/**
 * Acknowledges that someone else published to a target, for the exact version
 * shown, or withdraws that acknowledgement. Anyone who can read the request
 * and edit the document can. Both are recorded in the activity.
 */
const reviewTarget: ServiceFn<
	[
		{
			id: number;
			requestDocumentId: number;
			target: string;
			revision: number;
			targetVersionId: number | null;
			reviewed: boolean;
			user: LucidActor;
			agentRunId?: string;
		},
	],
	undefined
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
	const RequestTargets = new RequestTargetsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const claimRes = await acquireRequestWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const request = claimRes.data.request;
	const document = request.documents.find(
		(document) => document.id === data.requestDocumentId,
	);
	if (!document) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.document.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	if (
		!canEditDocument({
			request,
			collectionKey: document.collection_key,
			user: data.user,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const stateRes = await getRequestState(context, { request });
	if (stateRes.error) return stateRes;

	const target = document.targets.find(
		(target) => target.target === data.target,
	);
	const currentVersionId =
		stateRes.data.get(document.id)?.versions.get(data.target)?.id ?? null;
	if (
		!target ||
		data.revision !== request.revision ||
		data.targetVersionId !== currentVersionId
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.review.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	const reviewedAt = new Date().toISOString();
	const targetRes = await RequestTargets.updateSingle({
		data: {
			reviewed_version_id: data.reviewed ? data.targetVersionId : null,
			reviewed_by: data.reviewed ? data.user.id : null,
			reviewed_at: data.reviewed ? reviewedAt : null,
		},
		where: [{ key: "id", operator: "=", value: target.id }],
	});
	if (targetRes.error) return targetRes;

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: request.id,
				user_id: data.user.id,
				agent_run_id: data.agentRunId ?? null,
				type: data.reviewed ? "target_reviewed" : "target_unreviewed",
				metadata: { target: data.target, requestDocumentId: document.id },
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	if (!data.reviewed && request.approvals.length > 0) {
		const dismissRes = await dismissApproval(context, {
			ids: [request.id],
			userId: data.user.id,
		});
		if (dismissRes.error) return dismissRes;
	}

	const requestRes = await Requests.updateSingle({
		data: { updated_at: reviewedAt },
		where: [{ key: "id", operator: "=", value: request.id }],
	});
	if (requestRes.error) return requestRes;

	return { error: undefined, data: undefined };
};

export default reviewTarget;
