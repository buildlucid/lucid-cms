import { copy } from "../../libs/i18n/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import addReviewer from "./helpers/add-reviewer.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import loadRelease from "./helpers/load-release.js";
import lockRelease from "./helpers/lock-release.js";

const unapprove: ServiceFn<
	[{ id: number; user: LucidUser }],
	undefined
> = async (context, data) => {
	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	if (!getReleaseAccess(context, { release, user: data.user }).approve) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (release.approved_revision !== release.revision) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.approval.missing"),
				status: 409,
			},
			data: undefined,
		};
	}

	const reviewerRes = await addReviewer(context, {
		release,
		userId: data.user.id,
	});
	if (reviewerRes.error) return reviewerRes;

	const dismissRes = await dismissApproval(context, {
		ids: [release.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	return { error: undefined, data: undefined };
};

export default unapprove;
