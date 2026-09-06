import type z from "zod";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/copy.js";
import { translate } from "../../libs/i18n/translate.js";
import type { ErrorResult, LucidErrorData } from "../../types/errors.js";
import errorTypeDefaults from "./error-type-defaults.js";

/**
 * Throw inside an HTTP handler to return a formatted Lucid error response.
 * Supply a Zod error with `zod` to include field validation details.
 *
 * @example
 * ```ts
 * throw new LucidAPIError({
 *   status: 404,
 *   message: copy.literal("The requested article was not found."),
 * });
 * ```
 */
class LucidAPIError extends Error {
	error: LucidErrorData;
	constructor(error: LucidErrorData) {
		super(translate(error.message) ?? constants.errors.message);
		this.error = error;

		if (error.zod !== undefined) {
			this.error.errors = LucidAPIError.formatZodErrors(
				error.zod?.issues || [],
			);
		}

		const errorTypeRes = errorTypeDefaults(error);

		this.error.status = errorTypeRes.status;
		this.error.name = errorTypeRes.name;
		this.error.message = errorTypeRes.message;
		this.name = translate(this.error.name) ?? constants.errors.message;
		this.message = translate(this.error.message) ?? constants.errors.message;
	}
	// static
	static formatZodErrors(error: z.core.$ZodIssue[]) {
		const result: ErrorResult = {};

		for (const item of error) {
			let current = result;
			for (const key of item.path) {
				if (typeof key === "number") {
					// @ts-expect-error
					// biome-ignore lint/suspicious/noAssignInExpressions: explanation
					current = current.children || (current.children = []);
					// @ts-expect-error
					// biome-ignore lint/suspicious/noAssignInExpressions: explanation
					current = current[key] || (current[key] = {});
				} else {
					// @ts-expect-error
					// biome-ignore lint/suspicious/noAssignInExpressions: explanation
					current = current[key] || (current[key] = {});
				}
			}
			current.code = item.code;
			current.message = copy.literal(item.message);
		}

		return result ?? undefined;
	}
}

export default LucidAPIError;
