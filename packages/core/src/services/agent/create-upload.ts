import type { LucidUser } from "../../types/hono.js";
import type { Media } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import createMedia from "../media/create-single.js";
import checkUploadAccess from "./helpers/check-upload-access.js";

/**
 * Registers an uploaded chat attachment as personal media. It stays private
 * and out of the media library, so the uploader can attach it to messages
 * straight away and nobody else sees it unless they move it to the library.
 */
const createUpload: ServiceFn<
	[
		{
			agentKey: string;
			key: string;
			fileName: string;
			width?: number;
			height?: number;
			user: LucidUser;
		},
	],
	Media
> = async (context, input) => {
	const access = await checkUploadAccess(context, {
		userId: input.user.id,
		agentKey: input.agentKey,
	});
	if (access.error) return access;

	return createMedia(context, {
		key: input.key,
		fileName: input.fileName,
		width: input.width,
		height: input.height,
		folderId: null,
		ownerUserId: input.user.id,
		origin: "human",
		actor: { type: "user", user: input.user },
		userId: input.user.id,
	});
};

export default createUpload;
