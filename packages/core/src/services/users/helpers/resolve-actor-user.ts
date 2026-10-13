import { copy } from "../../../libs/i18n/index.js";
import systemActor from "../../../libs/permission/system-actor.js";
import type { ToolkitActor } from "../../../libs/permission/toolkit-actor.js";
import type { LucidActor, LucidUser } from "../../../types/hono.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import loadActiveUser from "./load-active-user.js";

/** Resolves a user actor to their live user permissions or returns the system actor. */
function resolveActorUser(
	context: ServiceContext,
	input: { actor: Extract<ToolkitActor, { type: "user" }> },
): ServiceResponse<LucidUser>;
function resolveActorUser(
	context: ServiceContext,
	input: { actor: ToolkitActor },
): ServiceResponse<LucidActor>;
async function resolveActorUser(
	context: ServiceContext,
	input: { actor: ToolkitActor },
): ServiceResponse<LucidActor> {
	if (input.actor.type === "system") {
		return { error: undefined, data: systemActor };
	}

	const userRes = await loadActiveUser(context, { id: input.actor.userId });
	if (userRes.error) return userRes;
	if (!userRes.data) {
		return {
			error: {
				status: 403,
				message: copy("server:core.users.actor.inactive"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: userRes.data };
}

export default resolveActorUser;
