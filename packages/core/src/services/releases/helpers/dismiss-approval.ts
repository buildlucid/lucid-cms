import {
	ReleaseEventsRepository,
	ReleasesRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Moves releases to a new revision after their content or plan changes, so an
 * earlier approval no longer applies. Approved releases record why.
 */
const dismissApproval: ServiceFn<
	[{ ids: number[]; userId?: number | null }],
	undefined
> = async (context, data) => {
	const ids = [...new Set(data.ids)];
	if (ids.length === 0) return { error: undefined, data: undefined };

	const Releases = new ReleasesRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const approvedRes = await Releases.selectApprovedIds({ ids });
	if (approvedRes.error) return approvedRes;

	const dismissRes = await Releases.dismissApproval({ ids });
	if (dismissRes.error) return dismissRes;

	if (approvedRes.data.length > 0) {
		const eventsRes = await ReleaseEvents.createEvents({
			data: approvedRes.data.map((releaseId) => ({
				release_id: releaseId,
				user_id: data.userId ?? null,
				type: "approval_dismissed" as const,
			})),
		});
		if (eventsRes.error) return eventsRes;
	}

	return { error: undefined, data: undefined };
};

export default dismissApproval;
