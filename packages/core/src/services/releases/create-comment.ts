import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/server";
import { copy } from "../../libs/i18n/index.js";
import { ReleaseEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import loadRelease from "./helpers/load-release.js";
import lockRelease from "./helpers/lock-release.js";

/**
 * Anyone who can read a release can comment on it, whatever its status. A
 * comment withdraws an approval, so the release is approved again once it
 * has been dealt with.
 */
const createComment: ServiceFn<
	[{ id: number; user: LucidUser; body: RichTextJSON }],
	undefined
> = async (context, data) => {
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	if (!generateText(data.body).trim()) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.comment.empty"),
				status: 400,
			},
			data: undefined,
		};
	}

	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	const eventsRes = await ReleaseEvents.createEvents({
		data: [
			{
				release_id: release.id,
				user_id: data.user.id,
				type: "comment",
				body: data.body,
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	if (release.approved_revision === release.revision) {
		const dismissRes = await dismissApproval(context, {
			ids: [release.id],
			userId: data.user.id,
		});
		if (dismissRes.error) return dismissRes;
	}

	return { error: undefined, data: undefined };
};

export default createComment;
