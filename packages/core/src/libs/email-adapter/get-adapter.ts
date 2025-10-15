import constants from "../../constants/constants.js";
import logger from "../logger/index.js";
import type { Config } from "../../types/config.js";
import type { EmailAdapterInstance } from "./types.js";
import passthroughEmailAdapter from "./adapters/passthrough.js";

/**
 * Get the preferred email adapter. Falls back to passthrough adapter.
 */
const getEmailAdapter = async (
	config: Config,
): Promise<{
	adapter: EmailAdapterInstance;
	simulated: boolean;
}> => {
	try {
		if (config.email?.adapter) {
			const adapter =
				typeof config.email.adapter === "function"
					? await config.email.adapter()
					: config.email.adapter;

			return {
				adapter: await adapter,
				simulated: config.email.simulate,
			};
		}

		return {
			adapter: await passthroughEmailAdapter(),
			simulated: true,
		};
	} catch (error) {
		logger.error({
			scope: constants.logScopes.emailAdapter,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize email adapter",
		});

		return {
			adapter: await passthroughEmailAdapter(),
			simulated: true,
		};
	}
};

export default getEmailAdapter;
