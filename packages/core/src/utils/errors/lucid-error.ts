import logger from "../../libs/logger/index.js";

/**
 * The LucidError class should be used to throw errors in functions that sit outside of API request lifecycle. This class will log the error and optionally kill the process.
 * @class
 * @extends Error
 * @param {string} data.message - The error message
 * @param {string} [data.scope] - Used to identify the scope of the logged error
 * @param {boolean} [data.kill] - If true, the process will exit with code 1
 * @returns {void}
 * @example
 * throw new LucidError({
 *     message: "Cannot set a value to a read-only property",
 *     scope: "plugin-name",
 *     kill: true,
 * });
 */
class LucidError extends Error {
	scope?: string;
	kill?: boolean;
	constructor(data: {
		message: string;
		scope?: string;
		kill?: boolean;
		data?: Record<string, unknown>;
	}) {
		super(data.message);
		this.scope = data.scope;
		this.kill = data.kill;

		logger.error({
			message: this.message,
			scope: this.scope,
			data: data.data ?? undefined,
		});

		if (this.kill) process.exit(1);
	}
}

export default LucidError;
