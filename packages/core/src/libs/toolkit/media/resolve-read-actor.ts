import type { MediaActor } from "../../../utils/media/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import { Permissions } from "../../permission/definitions.js";
import hasAccess from "../../permission/has-access.js";
import type { ToolkitActor } from "../../permission/toolkit-actor.js";

/** The media a toolkit read reaches: library media with `libraryOnly`, what a user actor with `media:read` sees in the admin, or all media for the system. */
const resolveReadActor = async (
	context: ServiceContext,
	data: { actor: ToolkitActor; libraryOnly: boolean },
): ServiceResponse<MediaActor> => {
	if (data.libraryOnly) return { error: undefined, data: { type: "content" } };

	const { default: resolveActorUser } =
		await import("../../../services/users/helpers/resolve-actor-user.js");
	const userRes = await resolveActorUser(context, { actor: data.actor });
	if (userRes.error) return userRes;

	const user = userRes.data;
	if (user.id === null) return { error: undefined, data: { type: "internal" } };
	if (!hasAccess({ user, requiredPermissions: [Permissions.MediaRead] })) {
		return {
			error: {
				status: 403,
				message: copy("server:core.toolkit.actor.permission.denied"),
			},
			data: undefined,
		};
	}
	return { error: undefined, data: { type: "user", user } };
};

export default resolveReadActor;
