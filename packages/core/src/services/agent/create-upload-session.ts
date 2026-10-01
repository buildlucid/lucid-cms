import type { UploadSessionResponse } from "@lucidcms/types";
import type { ServiceFn } from "../../utils/services/types.js";
import createMediaUploadSession from "../media/create-upload-session.js";
import checkUploadAccess from "./helpers/check-upload-access.js";

/** Starts a private upload for a chat attachment. Finish it with `createUpload`. */
const createUploadSession: ServiceFn<
	[
		{
			agentKey: string;
			fileName: string;
			mimeType: string;
			size: number;
			userId: number;
		},
	],
	UploadSessionResponse
> = async (context, input) => {
	const access = await checkUploadAccess(context, {
		userId: input.userId,
		agentKey: input.agentKey,
	});
	if (access.error) return access;

	return createMediaUploadSession(context, {
		fileName: input.fileName,
		mimeType: input.mimeType,
		size: input.size,
		public: false,
		userId: input.userId,
	});
};

export default createUploadSession;
