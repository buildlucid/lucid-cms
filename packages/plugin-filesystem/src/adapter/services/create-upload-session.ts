import { createSignedMediaUrl } from "@lucidcms/core/media-storage";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceCreateUploadSession,
} from "@lucidcms/core/types";
import { FILE_SYSTEM_UPLOAD_PATH } from "../helpers.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const createUploadSession: MediaStorageAdapterServiceCreateUploadSession =
		async (_context, props) => {
			try {
				return {
					error: undefined,
					data: {
						protocol: "http",
						key: props.key,
						request: {
							url: createSignedMediaUrl({
								host: props.host,
								path: FILE_SYSTEM_UPLOAD_PATH,
								key: props.key,
								secretKey: options.secretKey,
								query: {
									mimeType: props.mimeType,
									extension: props.extension,
								},
							}),
							method: "PUT",
							body: { type: "raw" },
						},
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
