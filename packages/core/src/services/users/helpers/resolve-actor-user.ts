import { copy } from "../../../libs/i18n/index.js";
import systemActor from "../../../libs/permission/system-actor.js";
import type { ToolkitActor } from "../../../libs/toolkit/types.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import loadActiveUser from "./load-active-user.js";

/** Loads the user an actor acts for with their live permissions, or the system actor. */
const resolveActorUser: ServiceFn<
	[{ actor: ToolkitActor }],
	LucidActor
> = async (context, input) => {
	if (input.actor.kind === "system") {
		return { error: undefined, data: systemActor };
	}

	const userRes = await loadActiveUser(context, { id: input.actor.userId });
	if (userRes.error) return userRes;
	if (!userRes.data) {
		return {
			error: {
				status: 403,
				message: copy("server:core.documents.authoring.actor.access.denied"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: userRes.data };
};

export default resolveActorUser;
