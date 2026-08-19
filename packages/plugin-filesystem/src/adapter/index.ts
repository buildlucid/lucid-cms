import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapter,
} from "@lucidcms/core/types";
import createUploadSession from "./services/create-upload-session.js";
import deleteMultiple from "./services/delete-multiple.js";
import deleteSingle from "./services/delete-single.js";
import getDownloadUrl from "./services/get-download-url.js";
import getMetadata from "./services/get-metadata.js";
import rename from "./services/rename.js";
import stream from "./services/stream.js";
import uploadSingle from "./services/upload-single.js";

const fileSystemStorageAdapter: MediaStorageAdapter<
	FileSystemStorageAdapterOptions
> = (options) => {
	return {
		type: "media-storage-adapter",
		key: "file-system",
		createUploadSession: createUploadSession(options),
		getDownloadUrl: getDownloadUrl(options),
		getMeta: getMetadata(options),
		stream: stream(options),
		upload: uploadSingle(options),
		delete: deleteSingle(options),
		deleteMultiple: deleteMultiple(options),
		rename: rename(options),
		getOptions: () => options,
	};
};

export default fileSystemStorageAdapter;
