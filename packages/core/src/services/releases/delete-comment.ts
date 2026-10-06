import { copy } from "../../libs/i18n/index.js";
import { ReleaseEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import loadRelease from "./helpers/load-release.js";

/**
 * People can delete their own comments and replies, and super admins can
 * delete anyone's. Deleting a comment removes its replies too.
 */
const deleteComment: ServiceFn<
	[{ id: number; eventId: number; user: LucidUser }],
	undefined
> = async (context, data) => {
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const comment = releaseRes.data.events.find(
		(event) => event.id === data.eventId && event.type === "comment",
	);
	if (!comment || (comment.user_id !== data.user.id && !data.user.superAdmin)) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const deleteRes = await ReleaseEvents.deleteSingle({
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (deleteRes.error) return deleteRes;

	return { error: undefined, data: undefined };
};

export default deleteComment;
