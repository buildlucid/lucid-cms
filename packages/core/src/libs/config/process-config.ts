import { castDraft, produce } from "immer";
import defaultConfig from "../../constants/default-config.js";
import type { Config, LucidConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
import BrickConfigSchema from "../collection/builders/brick-builder/schema.js";
import CollectionConfigSchema from "../collection/builders/collection-builder/schema.js";
import CustomFieldSchema from "../collection/custom-fields/schema.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { translate } from "../i18n/index.js";
import { initializeLogger } from "../logger/index.js";
import type { LucidConfigRecipe } from "../runtime/types.js";
import checkAccess from "./checks/check-access.js";
import checkCollectionEnvironmentVersionMap from "./checks/check-collection-environment-version-map.js";
import checkDuplicateBuilderKeys from "./checks/check-duplicate-builder-keys.js";
import checkDuplicateFieldKeys from "./checks/check-duplicate-field-keys.js";
import checkField from "./checks/check-field.js";
import checkFieldConditions from "./checks/check-field-conditions.js";
import checkLocales from "./checks/check-locales.js";
import checkRepeaterDepth from "./checks/check-repeater-depth.js";
import checkTenants from "./checks/check-tenants.js";
import ConfigSchema from "./config-schema.js";
import mergeConfig from "./merge-config.js";
import normalizeConfigSecrets from "./utils/normalize-config-secrets.js";

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
		mode?: "runtime" | "build";
		resolvedDb?: DatabaseAdapter;
		recipe?: LucidConfigRecipe;
	},
): Promise<Config> => {
	if (
		cachedConfig !== undefined &&
		options?.mode !== "build" &&
		!options?.bypassCache
	) {
		return cachedConfig;
	}

	if (Object.hasOwn(config, "db")) {
		throw new LucidError({
			message:
				"Lucid config must not define `config.db`. Move your database adapter to the top-level `db` property passed to configureLucid().",
		});
	}

	if (!options?.resolvedDb) {
		throw new LucidError({
			message:
				"Lucid could not resolve the configured database adapter. Define it via `configureLucid({ db, config })`.",
		});
	}

	let configRes = mergeConfig(config, defaultConfig);

	Object.assign(configRes, {
		db: options.resolvedDb,
	});

	configRes = normalizeConfigSecrets(configRes, options?.mode);

	if (options?.recipe) {
		configRes = produce(configRes, options.recipe);
		configRes = normalizeConfigSecrets(configRes, options?.mode);
	}

	const userTranslationSources = [...(configRes.i18n.sources ?? [])];

	configRes = produce(configRes, (draft) => {
		draft.i18n.sources = [];
	});

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
						message:
							translate(res.error.message) ??
							translate("server:core.plugins.init.failed", {
								data: {
									key: pluginDef.key,
								},
							}),
					});
				}
			}

			configRes = produce(configRes, pluginDef.recipe);
		}
	}

	const pluginTranslationSources = [...(configRes.i18n.sources ?? [])];

	configRes = produce(configRes, (draft) => {
		draft.i18n.sources = castDraft([
			...pluginTranslationSources,
			...userTranslationSources,
		]);
		draft.localization.locales = draft.localization.locales.map((locale) => ({
			...locale,
			direction: locale.direction ?? "ltr",
		}));
		draft.i18n.locales = draft.i18n.locales.map((locale) => ({
			...locale,
			direction: locale.direction ?? "ltr",
		}));
	});

	if (!options?.skipValidation) {
		// validate config
		configRes = ConfigSchema.parse(configRes) as Config;

		// i18n checks
		checkLocales(configRes.localization);
		checkLocales(configRes.i18n);

		// tenant checks
		checkTenants(configRes);

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

			checkFieldConditions("collection", collection.key, collection);

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
				checkFieldConditions("brick", brick.key, brick);
				checkRepeaterDepth("brick", brick.key, brick.meta.repeaterDepth);
			}
		}

		checkCollectionEnvironmentVersionMap(configRes);
		checkAccess(configRes);
	}

	initializeLogger({
		transport: configRes.logger.transport,
		level: configRes.logger.level,
		force: true,
	});

	if (options?.mode === "build") {
		return configRes;
	}

	cachedConfig = configRes;
	return cachedConfig;
};

export default processConfig;
