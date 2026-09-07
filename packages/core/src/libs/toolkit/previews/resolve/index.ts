import type z from "zod";
import type { PreviewSession } from "../../../../exports/types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitPreviewsResolveInput = z.input<typeof inputSchema>;

const resolve = async (
	context: ServiceContext,
	input: ToolkitPreviewsResolveInput,
): ServiceResponse<PreviewSession> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: resolvePreviewSession } = await import(
				"../../../../services/preview-sessions/resolve.js"
			);

			return resolvePreviewSession(context, { token: data.token });
		},
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
