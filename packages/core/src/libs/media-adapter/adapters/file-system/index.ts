import type {
	FileSystemMediaAdapterOptions,
	MediaAdapter,
} from "../../types.js";
import deleteMultiple from "./services/delete-multiple.js";
import deletSingle from "./services/delete-single.js";
import getMetadata from "./services/get-metadata.js";
import getPresignedUrl from "./services/get-presigned-url.js";
import stream from "./services/stream.js";
import uploadSingle from "./services/upload-single.js";
import rename from "./services/rename.js";

const fileSystemAdapter: MediaAdapter<FileSystemMediaAdapterOptions> = (
	options,
) => {
	return {
		type: "media-adapter",
		key: "file-system",
		services: {
			getPresignedUrl: getPresignedUrl(options),
			getMeta: getMetadata(options),
			stream: stream(options),
			upload: uploadSingle(options),
			delete: deletSingle(options),
			deleteMultiple: deleteMultiple(options),
			rename: rename(options),
		},
		getOptions: () => options,
	};
};

export default fileSystemAdapter;
