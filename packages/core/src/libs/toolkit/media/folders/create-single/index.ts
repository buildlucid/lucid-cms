import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { copy } from "../../../../i18n/index.js";
import { Permissions } from "../../../../permission/definitions.js";
import hasAccess from "../../../../permission/has-access.js";
import { runToolkitService } from "../../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitMediaFoldersCreateSingleInput = z.input<typeof inputSchema>;

/** Creates a media library folder and returns its ID. */
const createSingle = (
	context: ServiceContext,
	input: ToolkitMediaFoldersCreateSingleInput,
): ServiceResponse<{ id: number }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: createFolder },
			] = await Promise.all([
				import("../../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../../utils/services/service-wrapper.js"),
				import("../../../../../services/media-folders/create-single.js"),
			]);

			const userRes = await resolveActorUser(context, { actor });
			if (userRes.error) return userRes;
			if (
				!hasAccess({
					user: userRes.data,
					requiredPermissions: [Permissions.MediaCreate],
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

			const result = await serviceWrapper(createFolder, {
				transaction: true,
			})(context, { ...data, userId: userRes.data.id });
			if (result.error) return result;

			return { error: undefined, data: { id: result.data } };
		},
		name: { key: "core.toolkit.media.folders.create-single.error.name" },
		message: { key: "core.toolkit.media.folders.create-single.error.message" },
	});

export default createSingle;
