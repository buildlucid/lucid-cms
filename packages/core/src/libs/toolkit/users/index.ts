import type { User } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import getMultiple, {
	type ToolkitUsersGetMultipleInput,
	type ToolkitUsersGetMultipleResult,
} from "./get-multiple/index.js";
import getSingle, {
	type ToolkitUsersGetSingleInput,
} from "./get-single/index.js";

/** Reads users as the system or as a user, who only sees what the admin would show them. */
export type ToolkitUsers = {
	/**
	 * Lists users and their total count before pagination, including deleted users unless filtered out.
	 *
	 * @example
	 * ```ts
	 * await toolkit.users.getMultiple({
	 *   actor: execution.actor,
	 *   query: {
	 *     filter: {
	 *       name: { value: "ada" },
	 *       isDeleted: { value: false },
	 *     },
	 *   },
	 * });
	 * ```
	 */
	getMultiple: (
		input?: ToolkitUsersGetMultipleInput,
	) => ServiceResponse<ToolkitUsersGetMultipleResult>;
	/** Returns a user by ID, including deleted users. */
	getSingle: (input: ToolkitUsersGetSingleInput) => ServiceResponse<User>;
};

export const createUsersToolkit = (context: ServiceContext): ToolkitUsers => ({
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
});

export default createUsersToolkit;
