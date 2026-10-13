import type { RequestCommentResolution } from "../../libs/db/tables/index.js";
import { copy } from "../../libs/i18n/index.js";
import { RequestEventsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestAccess from "./helpers/get-request-access.js";
import isCommentAuthor from "./helpers/is-comment-author.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";

/** Updates an open request's comment-thread resolution for its author, editors or approvers, using null to reopen and dismiss approvals. */
const updateCommentResolution: ServiceFn<
	[
		{
			id: number;
			commentId: number;
			user: LucidActor;
			agentRunId?: string;
			resolution: RequestCommentResolution | null;
		},
	],
	undefined
> = async (context, data) => {
	const RequestEvents = new RequestEventsRepository(context.db);

	//* open comments stop approval, so changes wait for any approval in progress
	const lockRes = await lockRequest(context, { id: data.id });
	if (lockRes.error) return lockRes;

	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	const comment = request.events.find(
		(event) =>
			event.id === data.commentId &&
			event.type === "comment" &&
			event.parent_id === null,
	);
	if (!comment) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const access = getRequestAccess(context, { request, user: data.user });
	const authorRes = await isCommentAuthor(context, { ...data, comment });
	if (authorRes.error) return authorRes;
	if (
		request.status !== "open" ||
		(!authorRes.data && !access.edit && !access.approve)
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

	const updateRes = await RequestEvents.updateSingle({
		data: {
			resolution: data.resolution,
			resolved_by: data.resolution ? data.user.id : null,
			resolved_by_run_id: data.resolution ? (data.agentRunId ?? null) : null,
			resolved_at: data.resolution ? new Date().toISOString() : null,
		},
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (updateRes.error) return updateRes;

	if (data.resolution === null && request.approvals.length > 0) {
		const dismissRes = await dismissApproval(context, {
			ids: [request.id],
			userId: data.user.id,
			agentRunId: data.agentRunId,
		});
		if (dismissRes.error) return dismissRes;
	}

	return { error: undefined, data: undefined };
};

export default updateCommentResolution;
