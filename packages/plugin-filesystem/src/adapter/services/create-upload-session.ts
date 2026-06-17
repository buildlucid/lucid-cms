import { createSignedMediaUrl } from "@lucidcms/core/media";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceCreateUploadSession,
} from "@lucidcms/core/types";
import { FILE_SYSTEM_UPLOAD_PATH } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const createUploadSession: MediaAdapterServiceCreateUploadSession = async (
		props,
	) => {
		try {
			return {
				error: undefined,
				data: {
					mode: "single",
					key: props.key,
					url: createSignedMediaUrl({
						host: props.meta.host,
						path: FILE_SYSTEM_UPLOAD_PATH,
						key: props.key,
						secretKey: options.secretKey,
						query: {
							mimeType: props.meta.mimeType,
							extension: props.meta.extension,
						},
					}),
				},
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: copy(
						"server:plugin.filesystem.media.upload.sessions.create.failed",
						{
							defaultMessage: error.message,
						},
					),
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return createUploadSession;
};
