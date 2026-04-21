import { createSignedMediaUrl } from "../../../signed-url.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceGetDownloadUrl,
} from "../../../types.js";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const getDownloadUrl: MediaAdapterServiceGetDownloadUrl = async (
		key,
		meta,
	) => {
		try {
			return {
				error: undefined,
				data: {
					url: createSignedMediaUrl({
						host: meta.host,
						path: FILE_SYSTEM_DOWNLOAD_PATH,
						key,
						secretKey: options.secretKey,
					}),
				},
			};
		} catch (e) {
			return {
				error: {
					message:
						e instanceof Error ? e.message : "Failed to sign download URL",
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return getDownloadUrl;
};
