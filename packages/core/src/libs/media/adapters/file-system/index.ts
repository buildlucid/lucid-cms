import type {
	FileSystemMediaAdapterOptions,
	MediaAdapter,
} from "../../types.js";
import createUploadSession from "./services/create-upload-session.js";
import deleteMultiple from "./services/delete-multiple.js";
import deletSingle from "./services/delete-single.js";
import getDownloadUrl from "./services/get-download-url.js";
import getMetadata from "./services/get-metadata.js";
import rename from "./services/rename.js";
import stream from "./services/stream.js";
import uploadSingle from "./services/upload-single.js";

const fileSystemAdapter: MediaAdapter<FileSystemMediaAdapterOptions> = (
	options,
) => {
	return {
		type: "media-adapter",
		key: "file-system",
		createUploadSession: createUploadSession(options),
		getDownloadUrl: getDownloadUrl(options),
		getMeta: getMetadata(options),
		stream: stream(options),
		upload: uploadSingle(options),
		delete: deletSingle(options),
		deleteMultiple: deleteMultiple(options),
		rename: rename(options),
		getOptions: () => options,
	};
};

export default fileSystemAdapter;
