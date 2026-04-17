import { produce } from "immer";
import defaultConfig from "../../constants/default-config.js";
import T from "../../translations/index.js";
import type { Config, LucidConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
import BrickConfigSchema from "../collection/builders/brick-builder/schema.js";
import CollectionConfigSchema from "../collection/builders/collection-builder/schema.js";
import CustomFieldSchema from "../collection/custom-fields/schema.js";
import { initializeLogger } from "../logger/index.js";
import checkDuplicateBuilderKeys from "./checks/check-duplicate-builder-keys.js";
import checkDuplicateFieldKeys from "./checks/check-duplicate-field-keys.js";
import checkField from "./checks/check-field.js";
import checkLocales from "./checks/check-locales.js";
import checkRepeaterDepth from "./checks/check-repeater-depth.js";
import ConfigSchema from "./config-schema.js";
import mergeConfig from "./merge-config.js";

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
		skipValidation?: boolean;
	},
): Promise<Config> => {
	if (cachedConfig !== undefined && !options?.bypassCache) {
		return cachedConfig;
	}

	let configRes = mergeConfig(config, defaultConfig);

	// merge plugin config
	if (Array.isArray(configRes.plugins)) {
		for (const pluginDef of configRes.plugins) {
			if (!options?.skipValidation) {
				const { default: checkPluginVersion } = await import(
					"./checks/check-plugin-version.js"
				);

				checkPluginVersion({
					key: pluginDef.key,
					requiredVersions: pluginDef.lucid,
				});
			}
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

	if (!options?.skipValidation) {
		// validate config
		configRes = ConfigSchema.parse(configRes) as Config;

		// localization checks
		checkLocales(configRes.localization);

		// collection checks
		checkDuplicateBuilderKeys(
			"collections",
			configRes.collections.map((c) => c.getData.key),
		);

		for (const collection of configRes.collections) {
			CollectionConfigSchema.parse(collection.config);

			for (const field of collection.flatFields) {
				CustomFieldSchema.parse(field);
				checkField(field, configRes);
			}

			checkDuplicateBuilderKeys(
				"bricks",
				collection.builderBricks.map((b) => b.key),
			);

			checkDuplicateFieldKeys(
				"collection",
				collection.key,
				collection.meta.fieldKeys,
			);

			checkRepeaterDepth(
				"collection",
				collection.key,
				collection.meta.repeaterDepth,
			);

			for (const brick of collection.brickInstances) {
				BrickConfigSchema.parse(brick.config);
				for (const field of brick.flatFields) {
					CustomFieldSchema.parse(field);
					checkField(field, configRes);
				}

				checkDuplicateFieldKeys("brick", brick.key, brick.meta.fieldKeys);
				checkRepeaterDepth("brick", brick.key, brick.meta.repeaterDepth);
			}
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
