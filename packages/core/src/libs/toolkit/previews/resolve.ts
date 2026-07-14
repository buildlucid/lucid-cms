import { documentPreviewServices } from "../../../services/index.js";
import type { DocumentPreviewResolveResponse } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { ToolkitTenantOptions } from "../types.js";
import { runToolkitService, withToolkitTenant } from "../utils.js";

export type ToolkitPreviewsResolveInput = ToolkitTenantOptions & {
	token: string;
};

const resolve = async (
	context: ServiceContext,
	input: ToolkitPreviewsResolveInput,
): ServiceResponse<DocumentPreviewResolveResponse> => {
	const serviceContext = withToolkitTenant(context, input);

	return runToolkitService(
		() =>
			documentPreviewServices.resolve(serviceContext, { token: input.token }),
		{
			name: {
				key: "core.toolkit.previews.resolve.error.name",
				defaultMessage: "Preview Toolkit Error",
			},
			message: {
				key: "core.toolkit.previews.resolve.error.message",
				defaultMessage: "Lucid toolkit could not resolve the preview token.",
			},
		},
	);
};

export default resolve;
