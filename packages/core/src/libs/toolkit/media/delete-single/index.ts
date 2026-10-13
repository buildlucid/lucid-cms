import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import hasAccess from "../../../permission/has-access.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitMediaDeleteSingleInput = z.input<typeof inputSchema>;

/** Soft-deletes media by default. Set hard to permanently remove it and its owned files. */
const deleteSingle = (
	context: ServiceContext,
	input: ToolkitMediaDeleteSingleInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, hard, id }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: deleteMedia },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				hard
					? import("../../../../services/media/delete-single-permanently.js")
					: import("../../../../services/media/delete-single.js"),
			]);

			const userRes = await resolveActorUser(context, { actor });
			if (userRes.error) return userRes;
			if (
				!hasAccess({
					user: userRes.data,
					requiredPermissions: [Permissions.MediaDelete],
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

			return serviceWrapper(deleteMedia, { transaction: true })(context, {
				id,
				actor: user.id === null ? { type: "internal" } : { type: "user", user },
				userId: user.id,
			});
		},
		name: {
			key: "core.toolkit.media.delete-single.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.delete-single.error.message",
			defaultMessage: "Lucid toolkit could not delete single media.",
		},
	});

export default deleteSingle;
