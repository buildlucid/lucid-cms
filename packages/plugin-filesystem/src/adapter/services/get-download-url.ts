import { copy, LucidError } from "@lucidcms/core";
import { createSignedMediaUrl } from "@lucidcms/core/extension";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceGetDownloadUrl,
} from "@lucidcms/core/types";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../helpers.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const getDownloadUrl: MediaStorageAdapterServiceGetDownloadUrl = async (
		context,
		props,
	) => {
		try {
			return {
				url: createSignedMediaUrl({
					host: props.host,
					path: FILE_SYSTEM_DOWNLOAD_PATH,
					key: props.key,
					secretKey: options.secretKey ?? context.config.secrets.encryption,
					query: {
						fileName: props.fileName ?? undefined,
						extension: props.extension ?? undefined,
					},
				}),
			};
		} catch (e) {
			if (e instanceof LucidError) throw e;
			throw new LucidError({
				message: copy(
					"server:plugin.filesystem.media.download.url.sign.failed",
					{
						defaultMessage:
							e instanceof Error ? e.message : "Failed to sign download URL",
					},
				),
				status: 500,
			});
		}
	};

	return getDownloadUrl;
};
