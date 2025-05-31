import T from "../../translations/index.js";
import mime from "mime-types";
import getMediaType from "./get-media-type.js";
import type { ServiceResponse } from "../services/types.js";
import type { MediaType } from "../../types.js";

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
	let mimeType = props.mimeType;
	const extension =
		mime.extension(mimeType ?? "") || props.fileName.split(".").pop() || "";

	if (mimeType === undefined || mimeType === null) {
		mimeType = mime.lookup(extension) || null;
	}
	if (mimeType === undefined || mimeType === null) {
		return {
			error: {
				type: "basic",
				name: T("media_error_getting_metadata"),
				message: T("media_error_getting_metadata"),
				status: 500,
			},
			data: undefined,
		};
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
