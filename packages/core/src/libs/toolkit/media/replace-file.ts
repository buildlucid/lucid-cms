import type { MediaUploadFile } from "../../../services/media/helpers/upload-file.js";
import uploadMedia from "../../../services/media/upload-single.js";
import type { MediaOrigin } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

/** Replacement file and supplied image, audio or video metadata. */
export type ToolkitMediaReplaceFileInput = {
	/** Media ID to preserve. The replacement must have the same media type. */
	id: number;
	/** File, bytes or binary stream to upload. Streams are consumed once. */
	file: MediaUploadFile;
	/** CMS user credited with the replacement. Omit for no user attribution. */
	userId?: number | null;
	/** File provenance. Omit to preserve the current origin. */
	origin?: MediaOrigin;
	/** Additional restrictions. These cannot increase the configured upload limit. MIME types may use wildcards such as image/*. */
	validation?: { maxBytes?: number; mimeTypes?: string[] };
	width?: number;
	height?: number;
	duration?: number | null;
	focalPoint?: { x: number; y: number };
	blurHash?: string;
	averageColor?: string;
	base64?: string | null;
	isDark?: boolean;
	isLight?: boolean;
};

/** ID of the media item whose file was replaced. */
export type ToolkitMediaReplaceFileResult = { id: number };

/** Replaces a file and its filename, preserving the media ID, text, folder and visibility. Old file metadata is refreshed or cleared. */
const replaceFile = (
	context: ServiceContext,
	input: ToolkitMediaReplaceFileInput,
): ServiceResponse<ToolkitMediaReplaceFileResult> =>
	runToolkitService({
		handler: () =>
			uploadMedia(context, {
				id: input.id,
				file: input.file,
				userId: input.userId ?? null,
				origin: input.origin,
				validation: input.validation,
				width: input.width,
				height: input.height,
				duration: input.duration,
				focalPoint: input.focalPoint,
				blurHash: input.blurHash,
				averageColor: input.averageColor,
				base64: input.base64,
				isDark: input.isDark,
				isLight: input.isLight,
			}),
		name: {
			key: "core.toolkit.media.replace-file.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.replace-file.error.message",
			defaultMessage: "Lucid toolkit could not replace the media file.",
		},
	});

export default replaceFile;
