import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/server";
import { copy } from "../../libs/i18n/index.js";
import { ReleaseEventsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import loadRelease from "./helpers/load-release.js";

/** People can only edit their own comments. */
const updateComment: ServiceFn<
	[{ id: number; eventId: number; user: LucidUser; body: RichTextJSON }],
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

	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	const comment = releaseRes.data.events.find(
		(event) => event.id === data.eventId && event.type === "comment",
	);
	if (!comment || comment.user_id !== data.user.id) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.comment.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const updateRes = await ReleaseEvents.updateSingle({
		data: { body: data.body, updated_at: new Date().toISOString() },
		where: [{ key: "id", operator: "=", value: comment.id }],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateComment;
