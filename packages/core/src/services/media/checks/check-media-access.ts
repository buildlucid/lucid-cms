import { copy } from "../../../libs/i18n/index.js";
import { MediaRepository } from "../../../libs/repositories/index.js";
import {
	getMediaOwnership,
	type MediaAction,
	type MediaActor,
} from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import mediaAccessError from "./media-access-error.js";

/**
 * Confirms media rows exist and the actor can act on them before writes.
 */
const checkMediaAccess: ServiceFn<
	[
		{
			id?: number;
			ids?: number[];
			actor: MediaActor;
			action: MediaAction;
		},
	],
	undefined
> = async (context, data) => {
	const ids = Array.from(
		new Set(data.ids ?? (data.id !== undefined ? [data.id] : [])),
	);

	if (ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Media = new MediaRepository(context.db);
	const mediaRes = await Media.selectMultipleValidationData({
		ids,
		validation: {
			enabled: true,
		},
	});
	if (mediaRes.error) return mediaRes;

	if (mediaRes.data.length !== ids.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	for (const media of mediaRes.data) {
		const error = mediaAccessError({
			actor: data.actor,
			ownership: getMediaOwnership(media),
			action: data.action,
		});
		if (error) return { error, data: undefined };
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkMediaAccess;
