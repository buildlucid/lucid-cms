import type {
	MediaResponse,
	MediaUrlResponse,
} from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type {
	ToolkitMediaGetMultipleInput,
	ToolkitMediaGetMultipleResult,
} from "./get-multiple.js";
import getMultiple from "./get-multiple.js";
import type { ToolkitMediaGetSingleInput } from "./get-single.js";
import getSingle from "./get-single.js";
import type { ToolkitMediaProcessInput } from "./process-media.js";
import processMedia from "./process-media.js";

export type ToolkitMedia = {
	/** Returns multiple media items and a total count. */
	getMultiple: (
		input?: ToolkitMediaGetMultipleInput,
	) => ServiceResponse<ToolkitMediaGetMultipleResult>;
	/** Returns a single media item by ID. */
	getSingle: (
		input: ToolkitMediaGetSingleInput,
	) => ServiceResponse<MediaResponse>;
	/** Returns a media URL, with optional processing such as resizing or format changes. */
	processMedia: (
		input: ToolkitMediaProcessInput,
	) => ServiceResponse<MediaUrlResponse>;
};

/** Creates media helpers for a toolkit instance. */
export const createMediaToolkit = (context: ServiceContext): ToolkitMedia => ({
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
	processMedia: (input) => processMedia(context, input),
});

export default createMediaToolkit;
