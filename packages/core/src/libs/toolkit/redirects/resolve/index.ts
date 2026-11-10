import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { ResolvedRedirect } from "../../../redirects/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type { ToolkitRedirectsResolveInput } from "./types.js";

export type * from "./types.js";

const resolve = async (
	context: ServiceContext,
	input: ToolkitRedirectsResolveInput,
): ServiceResponse<ResolvedRedirect | null> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: resolveRedirect } =
				await import("../../../../services/redirects/resolve.js");

			return resolveRedirect(context, data);
		},
		name: {
			key: "core.toolkit.redirects.resolve.error.name",
			defaultMessage: "Redirects Toolkit Error",
		},
		message: {
			key: "core.toolkit.redirects.resolve.error.message",
			defaultMessage: "Lucid toolkit could not look up the redirect.",
		},
	});
};

export default resolve;
