import checks from "./checks/index.js";
import ConfigSchema from "./config-schema.js";
import mergeConfig from "./merge-config.js";
import defaultConfig from "../../constants/default-config.js";
import CollectionConfigSchema from "../builders/collection-builder/schema.js";
import BrickConfigSchema from "../builders/brick-builder/schema.js";
import CustomFieldSchema from "../custom-fields/schema.js";
import { initializeLogger } from "../logger/index.js";
import type { Config, LucidConfig } from "../../types/config.js";
import { produce } from "immer";
import LucidError from "../../utils/errors/lucid-error.js";
import T from "../../translations/index.js";

let cachedConfig: Config | undefined;

/**
 * Responsible for:
 * - merging the default config with the config
 * - initializing the plugins
 * - validation & checks
 */
const processConfig = async (
	config: LucidConfig,
	options?: {
		bypassCache?: boolean;
	},
): Promise<Config> => {
	if (cachedConfig !== undefined && !options?.bypassCache) {
		return cachedConfig;
	}

	let configRes = mergeConfig(config, defaultConfig);

	// merge plugin config
	if (Array.isArray(configRes.plugins)) {
		for (const pluginDef of configRes.plugins) {
			checks.checkPluginVersion({
				key: pluginDef.key,
				requiredVersions: pluginDef.lucid,
			});
			if (pluginDef.hooks?.init) {
				const res = await pluginDef.hooks.init();
				if (res.error) {
					//* will get caught by the CLI
					throw new LucidError({
						scope: pluginDef.key,
						message: res.error.message ?? T("plugin_init_error"),
					});
				}
			}

			configRes = produce(configRes, pluginDef.recipe);
		}
	}

	// validate config
	configRes = ConfigSchema.parse(configRes) as Config;

	// localization checks
	checks.checkLocales(configRes.localization);

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

			checks.checkDuplicateFieldKeys("brick", brick.key, brick.meta.fieldKeys);
			checks.checkRepeaterDepth("brick", brick.key, brick.meta.repeaterDepth);
		}
	}

	initializeLogger({
		transport: configRes.logger.transport,
		level: configRes.logger.level,
		force: true,
	});

	cachedConfig = configRes;

	return configRes;
};

export default processConfig;
