import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import handleRequest, {
	type ToolkitPreviewRequestState,
	type ToolkitPreviewsHandleRequestInput,
} from "./handle-request.js";

export type ToolkitPreviews = {
	/** Activates, resumes, or exits preview mode for a frontend request. */
	handleRequest: (
		input: ToolkitPreviewsHandleRequestInput,
	) => ServiceResponse<ToolkitPreviewRequestState>;
};

export const createPreviewsToolkit = (
	context: ServiceContext,
): ToolkitPreviews => ({
	handleRequest: (input) => handleRequest(context, input),
});

export default createPreviewsToolkit;
