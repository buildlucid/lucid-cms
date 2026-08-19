import type { Media, MediaUrl } from "../../../types/response.js";
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
import type { ToolkitMediaResolveUrlInput } from "./resolve-url.js";
import resolveUrl from "./resolve-url.js";

export type ToolkitMedia = {
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
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
	resolveUrl: (input) => resolveUrl(context, input),
});

export default createMediaToolkit;
