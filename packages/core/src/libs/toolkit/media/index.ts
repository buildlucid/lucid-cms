import type { Media, MediaUrl } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import deleteSingle from "./delete-single/index.js";
import type {
	ToolkitMediaGetMultipleInput,
	ToolkitMediaGetMultipleResult,
} from "./get-multiple/index.js";
import getMultiple from "./get-multiple/index.js";
import type { ToolkitMediaGetSingleInput } from "./get-single/index.js";
import getSingle from "./get-single/index.js";
import replaceFile from "./replace-file/index.js";
import requestDownload from "./request-download/index.js";
import type { ToolkitMediaResolveUrlInput } from "./resolve-url/index.js";
import resolveUrl from "./resolve-url/index.js";
import stream from "./stream/index.js";
import updateSingle from "./update-single/index.js";
import uploadFile from "./upload-file/index.js";

export type ToolkitMedia = {
	/** Updates media details without uploading a file and returns its ID. */
	updateSingle: (
		input: Parameters<typeof updateSingle>[1],
	) => ReturnType<typeof updateSingle>;
	/** Uploads a file and creates a media item, returning its ID. */
	uploadFile: (
		input: Parameters<typeof uploadFile>[1],
	) => ReturnType<typeof uploadFile>;
	/** Replaces a file while preserving the media ID, text, folder and visibility. */
	replaceFile: (
		input: Parameters<typeof replaceFile>[1],
	) => ReturnType<typeof replaceFile>;
	/** Reads original file contents. */
	stream: (input: Parameters<typeof stream>[1]) => ReturnType<typeof stream>;
	/** Creates a temporary download URL. */
	requestDownload: (
		input: Parameters<typeof requestDownload>[1],
	) => ReturnType<typeof requestDownload>;
	/** Soft-deletes media, or permanently removes it when hard is true. */
	deleteSingle: (
		input: Parameters<typeof deleteSingle>[1],
	) => ReturnType<typeof deleteSingle>;
	/** Returns multiple media items and a total count. */
	getMultiple: (
		input?: ToolkitMediaGetMultipleInput,
	) => ServiceResponse<ToolkitMediaGetMultipleResult>;
	/** Returns a single media item by ID. */
	getSingle: (input: ToolkitMediaGetSingleInput) => ServiceResponse<Media>;
	/** Resolves a media URL, with optional image transformations. */
	resolveUrl: (input: ToolkitMediaResolveUrlInput) => ServiceResponse<MediaUrl>;
};

/** Creates media helpers for a toolkit instance. */
export const createMediaToolkit = (context: ServiceContext): ToolkitMedia => ({
	uploadFile: (input) => uploadFile(context, input),
	replaceFile: (input) => replaceFile(context, input),
	updateSingle: (input) => updateSingle(context, input),
	stream: (input) => stream(context, input),
	requestDownload: (input) => requestDownload(context, input),
	deleteSingle: (input) => deleteSingle(context, input),
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
	resolveUrl: (input) => resolveUrl(context, input),
});

export default createMediaToolkit;
