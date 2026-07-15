import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import status, {
	type ToolkitAuthStatus,
	type ToolkitAuthStatusInput,
} from "./status.js";

export type ToolkitAuth = {
	/** Resolves authentication status from a server-rendered frontend request. */
	status: (input: ToolkitAuthStatusInput) => ServiceResponse<ToolkitAuthStatus>;
};

export const createAuthToolkit = (context: ServiceContext): ToolkitAuth => ({
	status: (input) => status(context, input),
});

export default createAuthToolkit;
