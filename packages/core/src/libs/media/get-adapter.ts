import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import logger from "../logger/index.js";
import type { MediaAdapterInstance } from "./types.js";

/**
 * Get the preferred media adapter
 */
const getMediaAdapter = async (
	config: Config,
): Promise<
	| {
			adapter: MediaAdapterInstance;
			enabled: true;
	  }
	| {
			adapter: null;
			/** Typically we'd have a passthrough adapter as a fallback, but we cannot mock media uploads so this value needs to exist */
			enabled: false;
	  }
> => {
	try {
		if (config.media.adapter) {
			const adapter =
				typeof config.media.adapter === "function"
					? await config.media.adapter()
					: config.media.adapter;

			return {
				adapter: await adapter,
				enabled: true,
			};
		}

		const { default: getDefaultMediaAdapter } = await import(
			"./get-default-adapter.js"
		);

		return {
			adapter: await getDefaultMediaAdapter(config),
			enabled: true,
		};
	} catch (error) {
		logger.error({
			scope: constants.logScopes.mediaAdapter,
			message:
				error instanceof Error
					? error.message
					: "Failed to initialize media adapter",
		});
		return {
			adapter: null,
			enabled: false,
		};
	}
};

export default getMediaAdapter;
