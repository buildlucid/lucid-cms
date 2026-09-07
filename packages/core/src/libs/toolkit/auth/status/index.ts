import constants from "../../../../constants/constants.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type { ToolkitAuthStatus, ToolkitAuthStatusInput } from "./types.js";

export type * from "./types.js";

const status = async (
	context: ServiceContext,
	input: ToolkitAuthStatusInput,
): ServiceResponse<ToolkitAuthStatus> => {
	return runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data): ServiceResponse<ToolkitAuthStatus> => {
			const { default: getAuthStatus } = await import(
				"../../../../services/auth/get-status.js"
			);

			if (data.headers) {
				await Promise.all([
					data.headers.set("Cache-Control", "private, no-store"),
					data.headers.set("Pragma", "no-cache"),
				]);
			}
			const [accessToken, refreshToken] = await Promise.all([
				data.cookies.get(constants.cookies.accessToken),
				data.cookies.get(constants.cookies.refreshToken),
			]);
			const statusRes = await getAuthStatus(context, {
				accessToken: accessToken ?? undefined,
				refreshToken: refreshToken ?? undefined,
			});

			if (statusRes.error) {
				if (statusRes.error.type === "authorisation") {
					return {
						error: undefined,
						data: { authenticated: false },
					};
				}
				return statusRes;
			}

			return {
				error: undefined,
				data: { authenticated: true },
			};
		},
		name: {
			key: "core.toolkit.auth.status.error.name",
			defaultMessage: "Authentication Toolkit Error",
		},
		message: {
			key: "core.toolkit.auth.status.error.message",
			defaultMessage: "Lucid toolkit could not resolve authentication status.",
		},
	});
};

export default status;
