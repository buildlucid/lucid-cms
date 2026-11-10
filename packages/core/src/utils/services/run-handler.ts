import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import LucidError from "../errors/lucid-error.js";
import type { ServiceResponse } from "./types.js";

/**
 * Runs a handler written by a project or plugin and turns its outcome into a service result.
 * A returned value becomes `data` and a thrown LucidError keeps its details. Anything else is
 * logged and becomes a 500 carrying the original error as `cause`.
 *
 * @example
 * ```ts
 * const result = await runHandler(() => options.handler({ context, input }));
 * if (result.error) return result;
 * ```
 */
const runHandler = async <T>(
	handler: () => T | Promise<T>,
): ServiceResponse<T> => {
	try {
		return { error: undefined, data: await handler() };
	} catch (error) {
		if (error instanceof LucidError) {
			return { error: { ...error.error }, data: undefined };
		}

		logger.error({
			error,
			event: "handler.execution.failed",
			message: "A handler threw an unexpected error",
		});

		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:core.errors.default.message"),
				cause: error,
			},
			data: undefined,
		};
	}
};

export default runHandler;
