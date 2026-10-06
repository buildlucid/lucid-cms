import { copy } from "../../libs/i18n/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import addReviewer from "./helpers/add-reviewer.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getRequestAccess from "./helpers/get-request-access.js";
import loadRequest from "./helpers/load-request.js";
import lockRequest from "./helpers/lock-request.js";

const unapprove: ServiceFn<
	[{ id: number; user: LucidUser }],
	undefined
> = async (context, data) => {
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

	if (request.approved_revision !== request.revision) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.approval.missing"),
				status: 409,
			},
			data: undefined,
		};
	}

	const reviewerRes = await addReviewer(context, {
		request,
		userId: data.user.id,
	});
	if (reviewerRes.error) return reviewerRes;

	const dismissRes = await dismissApproval(context, {
		ids: [request.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	return { error: undefined, data: undefined };
};

export default unapprove;
