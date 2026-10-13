import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import hasAccess from "../../../permission/has-access.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitMediaUpdateSingleInput,
	ToolkitMediaUpdateSingleResult,
} from "./types.js";

export type * from "./types.js";

const updateSingle = (
	context: ServiceContext,
	input: ToolkitMediaUpdateSingleInput,
): ServiceResponse<ToolkitMediaUpdateSingleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: updateSingleMedia },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/media/update-single.js"),
			]);

			const userRes = await resolveActorUser(context, { actor });
			if (userRes.error) return userRes;
			if (
				!hasAccess({
					user: userRes.data,
					requiredPermissions: [Permissions.MediaUpdate],
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

			const user = userRes.data;

			const result = await serviceWrapper(updateSingleMedia, {
				transaction: true,
			})(context, {
				...data,
				actor: user.id === null ? { type: "internal" } : { type: "user", user },
				userId: user.id,
				agentRunId: actor.agentRunId,
			});
			if (result.error) return result;

			return { error: undefined, data: { id: result.data } };
		},
		name: {
			key: "core.toolkit.media.update-single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.update-single.error.message",
			defaultMessage: "Lucid toolkit could not update media.",
		},
	});

export default updateSingle;
