import { copy } from "../../../libs/i18n/index.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { MediaOwnership } from "../../../types/response.js";
import {
	canAccessMedia,
	type MediaAction,
	type MediaActor,
} from "../../../utils/media/index.js";

/**
 * The error for media an actor can't act on, if any. Media they can't see is
 * reported as missing so other users' personal files stay undiscoverable.
 */
const mediaAccessError = (props: {
	actor: MediaActor;
	ownership: MediaOwnership;
	action: MediaAction;
}): LucidErrorData | undefined => {
	if (!canAccessMedia({ ...props, action: "read" })) {
		return {
			type: "basic",
			message: copy("server:core.media.not.found.message"),
			status: 404,
		};
	}
	if (!canAccessMedia(props)) {
		return {
			type: "basic",
			name: copy("server:core.permissions.error.name"),
			message: copy("server:core.permissions.denied"),
			status: 403,
		};
	}

	return undefined;
};

export default mediaAccessError;
