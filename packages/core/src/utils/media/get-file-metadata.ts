import mime from "mime-types";
import type { MediaType } from "../../types.js";
import type { ServiceResponse } from "../services/types.js";
import getMediaType from "./get-media-type.js";

export type FileMetadata = {
	mimeType: string;
	type: MediaType;
	extension: string;
};

/**
 * Gets the metadata for a file.
 */
const getFileMetadata = async (props: {
	mimeType: string | null;
	fileName: string;
}): ServiceResponse<FileMetadata> => {
	const fallbackMimeType = "application/octet-stream";
	const fileNameExtension =
		props.fileName.split(".").pop()?.toLowerCase() || "";
	let mimeType = props.mimeType?.toLowerCase().split(";")[0]?.trim() || null;
	let extension = mime.extension(mimeType || "") || fileNameExtension;

	if (mimeType === undefined || mimeType === null) {
		mimeType = mime.lookup(fileNameExtension || extension) || null;
	}
	if (mimeType === "application/mp4") {
		mimeType = "video/mp4";
	}
	if (mimeType === undefined || mimeType === null) {
		mimeType = fallbackMimeType;
	}
	if (!extension) {
		extension = mime.extension(mimeType) || "bin";
	}

	const type = getMediaType(mimeType);

	return {
		error: undefined,
		data: {
			mimeType,
			type,
			extension,
		},
	};
};

export default getFileMetadata;
