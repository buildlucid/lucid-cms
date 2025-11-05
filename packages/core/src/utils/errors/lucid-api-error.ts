import type z from "zod/v4";
import constants from "../../constants/constants.js";
import type { ErrorResult, LucidErrorData } from "../../types/errors.js";
import errorTypeDefaults from "./error-type-defaults.js";

/**
 * The LucidAPIError class should be used to throw errors within the API request lifecycle. This will be caught by Hono's error handler and will return a formatted error response. If the error is a Zod error, it will be formatted into a more readable format.
 * @class
 * @extends Error
 * @param {LucidErrorData} error
 * @returns {void}
 * @example
 * throw new LucidAPIError({
 *    type: "basic",
 *    name: "Fetch User Error",
 *    message: "Error while fetching user data",
 *    status: 500,
 * });
 * @example
 * throw new LucidAPIError({
 *    type: "validation",
 *    name: "Validation Error",
 *    message: "Validation error occurred",
 *    status: 400,
 *    errors: {
 *        email: {
 *             code: "invalid_email",
 *             message: "Invalid email address",
 *        },
 *    },
 * });
 */
class LucidAPIError extends Error {
	error: LucidErrorData;
	constructor(error: LucidErrorData) {
		super(error.message);
		this.error = error;

		if (error.zod !== undefined) {
			this.error.errors = LucidAPIError.formatZodErrors(
				error.zod?.issues || [],
			);
		}

		const errorTypeRes = errorTypeDefaults(error);

		this.error.status = errorTypeRes.status;
		this.name = errorTypeRes.name ?? constants.errors.name;
		this.message = errorTypeRes.message ?? constants.errors.message;
	}
	// static
	static formatZodErrors(error: z.core.$ZodIssue[]) {
		const result: ErrorResult = {};

		for (const item of error) {
			let current = result;
			for (const key of item.path) {
				if (typeof key === "number") {
					// @ts-expect-error
					// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
					current = current.children || (current.children = []);
					// @ts-expect-error
					// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
					current = current[key] || (current[key] = {});
				} else {
					// @ts-expect-error
					// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
					current = current[key] || (current[key] = {});
				}
			}
			current.code = item.code;
			current.message = item.message;
		}

		return result ?? undefined;
	}
}

export default LucidAPIError;
