import T from "../../translations/index.js";
import type { Config, LucidConfig } from "../../types/config.js";
import checks from "./checks/index.js";
import { ZodError } from "zod";
import ConfigSchema from "./config-schema.js";
import mergeConfig from "./merge-config.js";
import defaultConfig from "./default-config.js";
import CollectionConfigSchema from "../builders/collection-builder/schema.js";
import BrickConfigSchema from "../builders/brick-builder/schema.js";
import { LucidError } from "../../utils/errors/index.js";
import CustomFieldSchema from "../custom-fields/schema.js";
import logger from "../../utils/logging/index.js";
import winstonLogger from "../../utils/logging/logger.js";
import constants from "../../constants/constants.js";

const lucidConfig = async (config: LucidConfig) => {
	let configRes = mergeConfig(config, defaultConfig);
	try {
		// merge plugin config
		if (Array.isArray(configRes.plugins)) {
			const postPluginConfig = configRes.plugins.reduce(async (acc, plugin) => {
				const configAfterPlugin = await acc;
				const pluginRes = await plugin(configAfterPlugin);
				checks.checkPluginVersion({
					key: pluginRes.key,
					requiredVersions: pluginRes.lucid,
				});
				return pluginRes.config;
			}, Promise.resolve(configRes));
			const res = await postPluginConfig;
			configRes = res;
		}

		// validate config
		configRes = ConfigSchema.parse(configRes) as Config;

		// localisation checks
		checks.checkLocales(configRes.localisation);

		// collection checks
		checks.checkDuplicateBuilderKeys(
			"collections",
			configRes.collections.map((c) => c.getData.key),
		);

		for (const collection of configRes.collections) {
			CollectionConfigSchema.parse(collection.config);

			for (const field of collection.flatFields) {
				CustomFieldSchema.parse(field);
				checks.checkField(field, configRes);
			}

			checks.checkDuplicateBuilderKeys(
				"bricks",
				collection.builderBricks.map((b) => b.key),
			);

			checks.checkDuplicateFieldKeys(
				"collection",
				collection.key,
				collection.meta.fieldKeys,
			);

			checks.checkRepeaterDepth(
				"collection",
				collection.key,
				collection.meta.repeaterDepth,
			);

			for (const brick of collection.brickInstances) {
				BrickConfigSchema.parse(brick.config);
				for (const field of brick.flatFields) {
					CustomFieldSchema.parse(field);
					checks.checkField(field, configRes);
				}

				checks.checkDuplicateFieldKeys(
					"brick",
					brick.key,
					brick.meta.fieldKeys,
				);
				checks.checkRepeaterDepth("brick", brick.key, brick.meta.repeaterDepth);
			}
		}

		// misc
		winstonLogger.level = configRes.logLevel;

		return configRes;
	} catch (err) {
		if (err instanceof ZodError) {
			for (const error of err.errors) {
				logger("error", {
					message: error.message,
					scope: constants.logScopes.config,
					data: {
						path: error.path.join("."),
					},
				});
			}
		} else if (err instanceof LucidError) {
		} else if (err instanceof Error) {
			logger("error", {
				scope: constants.logScopes.config,
				message: err.message,
			});
		} else {
			logger("error", {
				scope: constants.logScopes.config,
				message: T("an_unknown_error_occurred"),
			});
		}

		if (err instanceof LucidError && err.kill === false) return configRes;
		process.exit(1);
	}
};

export default lucidConfig;
