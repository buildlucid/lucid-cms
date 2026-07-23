import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import passthroughEmailAdapter from "./adapters/passthrough.js";
import type { EmailAdapterInstance } from "./types.js";

/**
 * Get the preferred email adapter. Falls back to passthrough adapter.
 */
const getEmailAdapter = async (
	config: Config,
): Promise<EmailAdapterInstance> => {
	try {
		if (config.email?.adapter) {
			const adapter =
				typeof config.email.adapter === "function"
					? await config.email.adapter()
					: config.email.adapter;

			return await adapter;
		}

		return await passthroughEmailAdapter();
	} catch (error) {
		logger.error({
			error,
			event: "email-adapter.initialization.failed",
			scope: constants.logScopes.emailAdapter,
			message: "Failed to initialize email adapter",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});

		return await passthroughEmailAdapter();
	}
};

export default getEmailAdapter;
