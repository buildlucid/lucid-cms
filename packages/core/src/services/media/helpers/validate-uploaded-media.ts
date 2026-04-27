import type { MediaAdapterServiceStream } from "../../../libs/media/types.js";
import T from "../../../translations/index.js";
import type { MediaType } from "../../../types/response.js";
import type { FileMetadata } from "../../../utils/media/index.js";
import { getFileMetadata } from "../../../utils/media/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import detectStreamMimeType from "./detect-stream-mime-type.js";

/**
 * Validates a stored upload using sniffed bytes where possible, while falling
 * back to adapter metadata for formats `file-type` cannot identify.
 */
const validateUploadedMedia = async (props: {
	stream: MediaAdapterServiceStream;
	key: string;
	fileName: string;
	mimeType: string | null;
	allowedType?: MediaType;
	expectedType?: MediaType;
}): ServiceResponse<FileMetadata> => {
	const detectedMimeType = await detectStreamMimeType(props.stream, props.key);
	const storedMetaRes = await getFileMetadata({
		mimeType: props.mimeType,
		fileName: props.fileName,
	});
	if (storedMetaRes.error) return storedMetaRes;

	const detectedMetaRes = detectedMimeType
		? await getFileMetadata({
				mimeType: detectedMimeType,
				fileName: props.fileName,
			})
		: undefined;
	if (detectedMetaRes?.error) return detectedMetaRes;

	if (
		detectedMetaRes?.data &&
		storedMetaRes.data.type !== "unknown" &&
		detectedMetaRes.data.type !== "unknown" &&
		storedMetaRes.data.type !== detectedMetaRes.data.type
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					file: {
						code: "media_error",
						message: T("media_error_detected_type_mismatch"),
					},
				},
			},
			data: undefined,
		};
	}

	const fileMetaData = detectedMetaRes?.data ?? storedMetaRes.data;

	if (
		props.allowedType !== undefined &&
		fileMetaData.type !== props.allowedType
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					file: {
						code: "media_error",
						message: T("media_error_invalid_type", {
							type: props.allowedType,
						}),
					},
				},
			},
			data: undefined,
		};
	}

	if (
		props.expectedType !== undefined &&
		fileMetaData.type !== props.expectedType
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					file: {
						code: "media_error",
						message: T("media_error_type_change_not_allowed"),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: fileMetaData,
	};
};

export default validateUploadedMedia;
