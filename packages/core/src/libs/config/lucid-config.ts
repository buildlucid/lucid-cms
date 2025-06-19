import T from "../../translations/index.js";
import checks from "./checks/index.js";
import { ZodError } from "zod/v4";
import ConfigSchema from "./config-schema.js";
import mergeConfig from "./merge-config.js";
import defaultConfig from "./default-config.js";
import CollectionConfigSchema from "../builders/collection-builder/schema.js";
import BrickConfigSchema from "../builders/brick-builder/schema.js";
import { LucidError } from "../../utils/errors/index.js";
import CustomFieldSchema from "../custom-fields/schema.js";
import logger from "../../utils/logging/index.js";
import { initialiseLogger } from "../../utils/logging/logger.js";
import constants from "../../constants/constants.js";
import inferSchema from "../../services/collection-migrator/schema/infer-schema.js";
import type { Config, LucidConfig } from "../../types/config.js";

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

			//* generate schema for collection
			const res = inferSchema(collection, configRes.db);
			if (res.error) return res;
			collection.collectionTableSchema = res.data;
		}

		initialiseLogger(configRes.logTransport, configRes.logLevel);

		return configRes;
	} catch (err) {
		if (err instanceof ZodError) {
			try {
				const parse: Array<{
					expected: string;
					code: string;
					path: Array<string | number>;
					message: string;
				}> = JSON.parse(err.message);

				for (const msg of parse) {
					logger("error", {
						message: msg.message,
						scope: constants.logScopes.config,
						data: {
							path: msg.path.join("."),
						},
					});
				}
			} catch (e) {
				logger("error", {
					message: err.message,
					scope: constants.logScopes.config,
					data: {
						path: err.stack,
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
