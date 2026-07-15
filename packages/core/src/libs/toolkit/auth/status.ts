import constants from "../../../constants/constants.js";
import { authServices } from "../../../services/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

type MaybePromise<T> = T | Promise<T>;

export type ToolkitAuthCookieStore = {
	/** Reads a Lucid session cookie from the frontend framework's current request. */
	get: (name: string) => MaybePromise<string | null | undefined>;
};

export type ToolkitAuthResponseHeaders = {
	/** Sets a response header on the frontend framework's current response. */
	set: (name: string, value: string) => MaybePromise<void>;
};

export type ToolkitAuthStatusInput = {
	/** Framework adapter for reading Lucid's browser session cookies. */
	cookies: ToolkitAuthCookieStore;
	/** Optional framework adapter used to prevent caching personalized HTML. */
	headers?: ToolkitAuthResponseHeaders;
};

export type ToolkitAuthStatus = {
	authenticated: boolean;
};

const setAuthResponseHeaders = async (headers?: ToolkitAuthResponseHeaders) => {
	if (!headers) return;

	await Promise.all([
		headers.set("Cache-Control", "private, no-store"),
		headers.set("Pragma", "no-cache"),
	]);
};

const status = async (
	context: ServiceContext,
	input: ToolkitAuthStatusInput,
): ServiceResponse<ToolkitAuthStatus> => {
	return runToolkitService<ToolkitAuthStatus>(
		async () => {
			await setAuthResponseHeaders(input.headers);
			const [accessToken, refreshToken] = await Promise.all([
				input.cookies.get(constants.cookies.accessToken),
				input.cookies.get(constants.cookies.refreshToken),
			]);
			const statusRes = await authServices.getStatus(context, {
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
		{
			name: {
				key: "core.toolkit.auth.status.error.name",
				defaultMessage: "Authentication Toolkit Error",
			},
			message: {
				key: "core.toolkit.auth.status.error.message",
				defaultMessage:
					"Lucid toolkit could not resolve authentication status.",
			},
		},
	);
};

export default status;
