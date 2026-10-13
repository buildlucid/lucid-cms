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
	ToolkitMediaUploadFileInput,
	ToolkitMediaUploadFileResult,
} from "./types.js";

export type * from "./types.js";

/** Uploads a file and creates a media item, returning its ID. Defaults to private and visible. */
const uploadFile = (
	context: ServiceContext,
	input: ToolkitMediaUploadFileInput,
): ServiceResponse<ToolkitMediaUploadFileResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, ...data }) => {
			const [{ default: resolveActorUser }, { default: uploadMedia }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/media/upload-single.js"),
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

			const user = userRes.data;

			//* uploads store the file before opening their own transaction
			return uploadMedia(context, {
				...data,
				actor: user.id === null ? { type: "internal" } : { type: "user", user },
				userId: user.id,
				agentRunId: actor.agentRunId,
			});
		},
		name: {
			key: "core.toolkit.media.upload-file.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.upload-file.error.message",
			defaultMessage: "Lucid toolkit could not upload media.",
		},
	});

export default uploadFile;
