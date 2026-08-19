import { createSignedMediaUrl } from "@lucidcms/core/media-storage";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceGetDownloadUrl,
} from "@lucidcms/core/types";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../helpers.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const getDownloadUrl: MediaStorageAdapterServiceGetDownloadUrl = async (
		_context,
		props,
	) => {
		try {
			return {
				error: undefined,
				data: {
					url: createSignedMediaUrl({
						host: props.host,
						path: FILE_SYSTEM_DOWNLOAD_PATH,
						key: props.key,
						secretKey: options.secretKey,
						query: {
							fileName: props.fileName ?? undefined,
							extension: props.extension ?? undefined,
						},
					}),
				},
			};
		} catch (e) {
			return {
				error: {
					message: copy(
						"server:plugin.filesystem.media.download.url.sign.failed",
						{
							defaultMessage:
								e instanceof Error ? e.message : "Failed to sign download URL",
						},
					),
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return getDownloadUrl;
};
