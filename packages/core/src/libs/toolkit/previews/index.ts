import type { DocumentPreviewResolveResponse } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitPreviewsResolveInput } from "./resolve.js";
import resolve from "./resolve.js";

export type ToolkitPreviews = {
	/** Resolves a preview token to its authorized document version target. */
	resolve: (
		input: ToolkitPreviewsResolveInput,
	) => ServiceResponse<DocumentPreviewResolveResponse>;
};

export const createPreviewsToolkit = (
	context: ServiceContext,
): ToolkitPreviews => ({
	resolve: (input) => resolve(context, input),
});

export default createPreviewsToolkit;
