import T from "../../translations/index.js";
import { getMediaType } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import type { UploadSessionResponse } from "../media/create-upload-session.js";

const createProfilePictureUploadSession: ServiceFn<
	[
		{
			fileName: string;
			mimeType: string;
			size: number;
			userId: number;
		},
	],
	UploadSessionResponse
> = async (context, data) => {
	if (getMediaType(data.mimeType) !== "image") {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					mimeType: {
						code: "media_error",
						message: T("media_error_invalid_type", {
							type: "image",
						}),
					},
				},
			},
			data: undefined,
		};
	}

	return mediaServices.createUploadSession(context, {
		fileName: data.fileName,
		mimeType: data.mimeType,
		size: data.size,
		public: true,
		userId: data.userId,
	});
};

export default createProfilePictureUploadSession;
