import type { MediaAdapterInstance } from "../../types.js";
import deleteMultiple from "./services/delete-multiple.js";
import deletSingle from "./services/delete-single.js";
import getMetadata from "./services/get-metadata.js";
import getPresignedUrl from "./services/get-presigned-url.js";
import stream from "./services/stream.js";
import uploadSingle from "./services/upload-single.js";

const fileSystemAdapter = (options: {
	uploadDir: string;
	secretKey: string;
}): MediaAdapterInstance => {
	return {
		type: "media-adapter",
		key: "file-system",
		lifecycle: {
			init: async () => {},
			destroy: async () => {},
		},
		services: {
			getPresignedUrl: getPresignedUrl(options),
			getMeta: getMetadata(options),
			stream: stream(options),
			upload: uploadSingle(options),
			delete: deletSingle(options),
			deleteMultiple: deleteMultiple(options),
		},
	};
};

export default fileSystemAdapter;
