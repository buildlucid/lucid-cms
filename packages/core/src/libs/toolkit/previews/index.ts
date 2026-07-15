import type { PreviewSession } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import handleRequest, {
	type ToolkitPreviewRequestState,
	type ToolkitPreviewsHandleRequestInput,
} from "./handle-request.js";
import resolve, { type ToolkitPreviewsResolveInput } from "./resolve.js";

export type ToolkitPreviews = {
	/** Activates, resumes, or exits preview mode for a frontend request. */
	handleRequest: (
		input: ToolkitPreviewsHandleRequestInput,
	) => ServiceResponse<ToolkitPreviewRequestState>;
	/** Validates a preview token and returns its runtime metadata. */
	resolve: (
		input: ToolkitPreviewsResolveInput,
	) => ServiceResponse<PreviewSession>;
};

export const createPreviewsToolkit = (
	context: ServiceContext,
): ToolkitPreviews => ({
	handleRequest: (input) => handleRequest(context, input),
	resolve: (input) => resolve(context, input),
});

export default createPreviewsToolkit;
