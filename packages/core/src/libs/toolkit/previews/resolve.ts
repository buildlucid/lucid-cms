import type { PreviewSession } from "../../../exports/types.js";
import resolvePreviewSession from "../../../services/preview-sessions/resolve.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

export type ToolkitPreviewsResolveInput = {
	token: string;
};

const resolve = async (
	context: ServiceContext,
	input: ToolkitPreviewsResolveInput,
): ServiceResponse<PreviewSession> => {
	return runToolkitService({
		handler: () => resolvePreviewSession(context, { token: input.token }),
		name: {
			key: "core.toolkit.preview.resolve.error.name",
			defaultMessage: "Preview Toolkit Error",
		},
		message: {
			key: "core.toolkit.preview.resolve.error.message",
			defaultMessage: "Lucid toolkit could not resolve the preview.",
		},
	});
};

export default resolve;
