import type { LucidActor } from "../../../types/hono.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import { Permissions } from "../../permission/definitions.js";
import hasAccess from "../../permission/has-access.js";
import type { ToolkitActor } from "../../permission/toolkit-actor.js";

/** Resolves the actor and enforces `email:read` for users. */
const resolveReadActor = async (
	context: ServiceContext,
	data: { actor: ToolkitActor },
): ServiceResponse<LucidActor> => {
	const { default: resolveActorUser } =
		await import("../../../services/users/helpers/resolve-actor-user.js");
	const userRes = await resolveActorUser(context, { actor: data.actor });
	if (userRes.error) return userRes;

	if (
		!hasAccess({
			user: userRes.data,
			requiredPermissions: [Permissions.EmailRead],
		})
	) {
		return {
			error: {
				status: 403,
				message: copy("server:core.toolkit.actor.permission.denied"),
			},
			data: undefined,
		};
	}
	return userRes;
};

export default resolveReadActor;
