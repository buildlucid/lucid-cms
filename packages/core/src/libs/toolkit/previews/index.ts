import type { PreviewSession } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import resolve, { type ToolkitPreviewsResolveInput } from "./resolve.js";
import state, {
	type ToolkitPreviewState,
	type ToolkitPreviewStateInput,
} from "./state.js";

export type ToolkitPreviews = {
	/** Resolves preview state and synchronizes its session for a frontend request. */
	state: (
		input: ToolkitPreviewStateInput,
	) => ServiceResponse<ToolkitPreviewState>;
	/** Validates a preview token and returns its runtime metadata. */
	resolve: (
		input: ToolkitPreviewsResolveInput,
	) => ServiceResponse<PreviewSession>;
};

export const createPreviewsToolkit = (
	context: ServiceContext,
): ToolkitPreviews => ({
	state: (input) => state(context, input),
	resolve: (input) => resolve(context, input),
});

export default createPreviewsToolkit;
