import {
	RequestEventsRepository,
	RequestsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Moves requests to a new revision after their content or plan changes, so
 * earlier approvals no longer apply. Requests that had approvals record why.
 */
const dismissApproval: ServiceFn<
	[{ ids: number[]; userId?: number | null }],
	undefined
> = async (context, data) => {
	const ids = [...new Set(data.ids)];
	if (ids.length === 0) return { error: undefined, data: undefined };

	const Requests = new RequestsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const approvedRes = await Requests.selectIdsWithApprovals({ ids });
	if (approvedRes.error) return approvedRes;

	const dismissRes = await Requests.dismissApproval({ ids });
	if (dismissRes.error) return dismissRes;

	if (approvedRes.data.length > 0) {
		const eventsRes = await RequestEvents.createEvents({
			data: approvedRes.data.map((requestId) => ({
				request_id: requestId,
				user_id: data.userId ?? null,
				type: "approval_dismissed" as const,
			})),
		});
		if (eventsRes.error) return eventsRes;
	}

	return { error: undefined, data: undefined };
};

export default dismissApproval;
