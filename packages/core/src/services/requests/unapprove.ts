import { copy } from "../../libs/i18n/index.js";
import {
	RequestApprovalsRepository,
	RequestEventsRepository,
	RequestsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveNotification from "../notifications/resolve.js";
import getRequestAccess from "./helpers/get-request-access.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";
import { requestNotificationKeys } from "./notifications/keys.js";
import { readyNotification } from "./notifications/ready.js";

/**
 * Withdraws the user's approval of the current revision. Other approvals still
 * count, but an approved request goes back to waiting for approval.
 */
const unapprove: ServiceFn<
	[{ id: number; user: LucidUser; agentRunId?: string }],
	undefined
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
	const RequestApprovals = new RequestApprovalsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
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

	const approval = request.approvals.find(
		(approval) => approval.user_id === data.user.id,
	);
	if (!approval) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.approval.missing"),
				status: 409,
			},
			data: undefined,
		};
	}

	const deleteRes = await RequestApprovals.deleteSingle({
		where: [{ key: "id", operator: "=", value: approval.id }],
	});
	if (deleteRes.error) return deleteRes;

	if (request.approved_revision === request.revision) {
		const updateRes = await Requests.updateSingle({
			data: {
				approved_revision: null,
				execution_job_id: null,
				updated_at: new Date().toISOString(),
			},
			where: [{ key: "id", operator: "=", value: request.id }],
		});
		if (updateRes.error) return updateRes;

		const readyRes = await resolveNotification(context, {
			definition: readyNotification,
			key: requestNotificationKeys.ready(request.id),
		});
		if (readyRes.error) return readyRes;
	}

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: request.id,
				user_id: data.user.id,
				agent_run_id: data.agentRunId ?? null,
				type: "approval_dismissed",
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default unapprove;
