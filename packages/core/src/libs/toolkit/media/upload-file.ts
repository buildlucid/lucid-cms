import type { MediaUploadFile } from "../../../services/media/helpers/upload-file.js";
import uploadMedia from "../../../services/media/upload-single.js";
import type { MediaOrigin } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

export type { MediaUploadFile as ToolkitMediaFile } from "../../../services/media/helpers/upload-file.js";
/** ID of the uploaded media item. */
export type ToolkitMediaUploadFileResult = { id: number };

/** Optional media text, visibility and supplied image, audio or video metadata. */
export type ToolkitMediaUploadFileInput = {
	folderId?: number | null;
	title?: { localeCode: string | null; value: string | null }[];
	alt?: { localeCode: string | null; value: string | null }[];
	description?: { localeCode: string | null; value: string | null }[];
	summary?: { localeCode: string | null; value: string | null }[];
	width?: number;
	height?: number;
	duration?: number | null;
	focalPoint?: { x: number; y: number };
	blurHash?: string;
	averageColor?: string;
	base64?: string | null;
	isDark?: boolean;
	isLight?: boolean;
	/** File provenance. Defaults to human. */
	origin?: MediaOrigin;
	/** Allow unauthenticated file access. Defaults to false. */
	public?: boolean;
	/** Exclude the media from ordinary library lists. Defaults to false. */
	isHidden?: boolean;
	/** CMS user credited with the upload. Omit for no user attribution. */
	userId?: number | null;
	/** Additional restrictions. These cannot increase the configured upload limit. MIME types may use wildcards such as image/*. */
	validation?: { maxBytes?: number; mimeTypes?: string[] };
	/** File, bytes or binary stream to upload. Streams are consumed once. */
	file: MediaUploadFile;
};

/** Uploads a file and creates a media item, returning its ID. Defaults to private and visible. */
const uploadFile = (
	context: ServiceContext,
	input: ToolkitMediaUploadFileInput,
): ServiceResponse<ToolkitMediaUploadFileResult> =>
	runToolkitService({
		handler: () =>
			uploadMedia(context, {
				...input,
				id: undefined,
				userId: input.userId ?? null,
			}),
		name: {
			key: "core.toolkit.media.upload-file.error.name",
			defaultMessage: "Media Toolkit Error",
		},
		message: {
			key: "core.toolkit.media.upload-file.error.message",
			defaultMessage: "Lucid toolkit could not upload media.",
		},
	});

export default uploadFile;
