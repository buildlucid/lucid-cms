import { createSignedMediaUrl } from "../../../signed-url.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceGetPresignedUrl,
} from "../../../types.js";
import { FILE_SYSTEM_UPLOAD_PATH } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const getPresignedUrl: MediaAdapterServiceGetPresignedUrl = async (
		key,
		meta,
	) => {
		try {
			return {
				error: undefined,
				data: {
					url: createSignedMediaUrl({
						host: meta.host,
						path: FILE_SYSTEM_UPLOAD_PATH,
						key,
						secretKey: options.secretKey,
					}),
				},
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: error.message,
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return getPresignedUrl;
};
