import type { ReleaseCommentResolution } from "../../libs/db/tables/index.js";
import { copy } from "../../libs/i18n/index.js";
import { ReleaseEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getReleaseAccess from "./helpers/get-release-access.js";
import loadRelease from "./helpers/load-release.js";
import lockRelease from "./helpers/lock-release.js";

/**
 * Resolves or closes a comment on an open release, or reopens it with null.
 * The comment's author and anyone who can edit or approve the release can.
 * Replies are resolved with their thread.
 */
const updateCommentResolution: ServiceFn<
	[
		{
			id: number;
			eventId: number;
			user: LucidUser;
			resolution: ReleaseCommentResolution | null;
		},
	],
	undefined
> = async (context, data) => {
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	//* open comments stop approval, so changes wait for any approval in progress
	const lockRes = await lockRelease(context, { id: data.id });
	if (lockRes.error) return lockRes;
	await using _lock = lockRes.data;

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const release = releaseRes.data;
	const comment = release.events.find(
		(event) =>
			event.id === data.eventId &&
			event.type === "comment" &&
			event.parent_id === null,
	);
	if (!comment) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const access = getReleaseAccess(context, { release, user: data.user });
	if (
		release.status !== "open" ||
		(comment.user_id !== data.user.id && !access.edit && !access.approve)
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const updateRes = await ReleaseEvents.updateSingle({
		data: {
			resolution: data.resolution,
			resolved_by: data.resolution ? data.user.id : null,
			resolved_at: data.resolution ? new Date().toISOString() : null,
		},
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateCommentResolution;
