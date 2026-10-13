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
import getReviewToken from "./helpers/get-review-token.js";

/**
 * Acknowledges or withdraws acknowledgement of a target version against the supplied review token.
 * @remarks Requires request read and document edit access; both actions record activity.
 */
const acknowledgeTarget: ServiceFn<
	[
		{
			id: number;
			requestDocumentId: number;
			target: string;
			acknowledged: boolean;
			/** The request's review token when it was read. */
			ifUnchanged: string;
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
	if (
		!target ||
		getReviewToken({ request, state: stateRes.data }) !== data.ifUnchanged
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.acknowledge.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	const acknowledgedAt = new Date().toISOString();
	const targetRes = await RequestTargets.updateSingle({
		data: data.acknowledged
			? {
					acknowledged_version_id:
						stateRes.data.get(document.id)?.versions.get(data.target)?.id ??
						null,
					acknowledged_by: data.user.id,
					acknowledged_by_run_id: data.agentRunId ?? null,
					acknowledged_at: acknowledgedAt,
				}
			: {
					acknowledged_version_id: null,
					acknowledged_by: null,
					acknowledged_by_run_id: null,
					acknowledged_at: null,
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
				type: data.acknowledged
					? "target_acknowledged"
					: "target_unacknowledged",
				metadata: { target: data.target, requestDocumentId: document.id },
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	if (!data.acknowledged && request.approvals.length > 0) {
		const dismissRes = await dismissApproval(context, {
			ids: [request.id],
			userId: data.user.id,
			agentRunId: data.agentRunId,
		});
		if (dismissRes.error) return dismissRes;
	}

	const requestRes = await Requests.updateSingle({
		data: { updated_at: acknowledgedAt },
		where: [{ key: "id", operator: "=", value: request.id }],
	});
	if (requestRes.error) return requestRes;

	return { error: undefined, data: undefined };
};

export default acknowledgeTarget;
