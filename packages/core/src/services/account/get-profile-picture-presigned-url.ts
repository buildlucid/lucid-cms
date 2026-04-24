import T from "../../translations/index.js";
import { getMediaType } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const getProfilePicturePresignedUrl: ServiceFn<
	[
		{
			fileName: string;
			mimeType: string;
		},
	],
	{
		url: string;
		key: string;
		headers?: Record<string, string>;
	}
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

	return mediaServices.getPresignedUrl(context, {
		fileName: data.fileName,
		mimeType: data.mimeType,
		public: true,
	});
};

export default getProfilePicturePresignedUrl;
