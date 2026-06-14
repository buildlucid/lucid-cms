import { copy } from "../../../../i18n/index.js";
import { createSignedMediaUrl } from "../../../signed-url.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceGetDownloadUrl,
} from "../../../types.js";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const getDownloadUrl: MediaAdapterServiceGetDownloadUrl = async (props) => {
		try {
			return {
				error: undefined,
				data: {
					url: createSignedMediaUrl({
						host: props.meta.host,
						path: FILE_SYSTEM_DOWNLOAD_PATH,
						key: props.key,
						secretKey: options.secretKey,
						query: {
							fileName: props.meta.fileName ?? undefined,
							extension: props.meta.extension ?? undefined,
						},
					}),
				},
			};
		} catch (e) {
			return {
				error: {
					message: copy("server:core.media.download.url.sign.failed", {
						defaultMessage:
							e instanceof Error ? e.message : "Failed to sign download URL",
					}),
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return getDownloadUrl;
};
