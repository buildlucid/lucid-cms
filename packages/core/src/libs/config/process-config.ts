import { produce } from "immer";
import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
import BrickConfigSchema from "../collection/builders/brick-builder/schema.js";
import CollectionConfigSchema from "../collection/builders/collection-builder/schema.js";
import { getFieldBuilderState } from "../collection/builders/field-builder/index.js";
import CustomFieldSchema from "../collection/custom-fields/schema.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { getJobRegistry } from "../jobs/registry.js";
import { initializeLogger } from "../logger/index.js";
import type { ConfigTransform } from "../runtime/types.js";
import checkCollectionEnvironmentVersionMap from "./checks/check-collection-environment-version-map.js";
import checkCollectionLocalization from "./checks/check-collection-localization.js";
import checkCollectionRouting from "./checks/check-collection-routing.js";
import checkContentRoutes from "./checks/check-content-routes.js";
import checkDuplicateBuilderKeys from "./checks/check-duplicate-builder-keys.js";
import checkDuplicateFieldKeys from "./checks/check-duplicate-field-keys.js";
import checkField from "./checks/check-field.js";
import checkFieldConditions from "./checks/check-field-conditions.js";
import checkJobDefinitions from "./checks/check-job-definitions.js";
import checkLocales from "./checks/check-locales.js";
import checkOpenRepeaters from "./checks/check-open-repeaters.js";
import checkRepeaterDepth from "./checks/check-repeater-depth.js";
import checkToolkitDefinitions from "./checks/check-toolkit-definitions.js";
import ConfigSchema from "./config-schema.js";
import coreJobDefinitions from "./core-job-definitions.js";
import resolveConfig from "./resolve-config.js";

/**
 * Responsible for:
 * - merging the default config with the config
 * - initializing the plugins
 * - validation & checks
 */
const processConfig = async (
	config: LucidConfig,
	options?: {
		skipValidation?: boolean;
		mode?: "runtime" | "build";
		resolvedDb?: DatabaseAdapter;
		configure?: ConfigTransform;
	},
): Promise<ResolvedLucidConfig> => {
	if (Object.hasOwn(config, "db")) {
		throw new LucidError({
			message:
				"Lucid config must not define `config.db`. Move your database adapter to the top-level `db` property passed to defineConfig().",
		});
	}
	if (!options?.resolvedDb) {
		throw new LucidError({
			message:
				"Lucid could not resolve the configured database adapter. Define it via `defineConfig({ db, config })`.",
		});
	}

	let configRes = await resolveConfig(config, {
		...options,
		resolvedDb: options.resolvedDb,
	});

	const jobDefinitions = [...coreJobDefinitions, ...configRes.jobs.definitions];

	configRes = produce(configRes, (draft) => {
		draft.localization.locales = draft.localization.locales.map((locale) => ({
			...locale,
			direction: locale.direction ?? "ltr",
		}));
		draft.i18n.locales = draft.i18n.locales.map((locale) => ({
			...locale,
			direction: locale.direction ?? "ltr",
		}));
	});

	configRes = {
		...configRes,
		jobs: {
			...configRes.jobs,
			definitions: jobDefinitions,
		},
	};

	if (!options?.skipValidation) {
		// validate config
		configRes = ConfigSchema.parse(configRes);

		// job definitions
		await checkJobDefinitions(configRes.jobs.definitions);

		// plugin toolkit definitions
		checkToolkitDefinitions(configRes.plugins);

		// custom content routes
		checkContentRoutes(configRes);

		// i18n checks
		checkLocales(configRes.localization);
		checkLocales(configRes.i18n);

		// create / check job registry
		getJobRegistry(configRes);

		// collection checks
		checkDuplicateBuilderKeys(
			"collections",
			configRes.collections.map((c) => c.getData.key),
		);

		for (const collection of configRes.collections) {
			CollectionConfigSchema.parse(collection.config);
			checkCollectionLocalization(configRes.localization, collection);
			checkCollectionRouting(collection);

			for (const field of collection.flatFields) {
				CustomFieldSchema.parse(field);
				checkField(field, configRes, collection);
			}

			checkDuplicateBuilderKeys(
				"bricks",
				collection.builderBricks.map((b) => b.key),
			);

			checkDuplicateFieldKeys(
				"collection",
				collection.key,
				getFieldBuilderState(collection).meta.fieldKeys,
			);

			checkFieldConditions("collection", collection.key, collection);

			checkRepeaterDepth(
				"collection",
				collection.key,
				getFieldBuilderState(collection).meta.repeaterDepth,
			);
			checkOpenRepeaters(
				"collection",
				collection.key,
				getFieldBuilderState(collection).repeaterStack,
			);

			for (const brick of collection.brickInstances) {
				BrickConfigSchema.parse(brick.config);
				for (const field of brick.flatFields) {
					CustomFieldSchema.parse(field);
					checkField(field, configRes, collection);
				}

				checkDuplicateFieldKeys(
					"brick",
					brick.key,
					getFieldBuilderState(brick).meta.fieldKeys,
				);
				checkFieldConditions("brick", brick.key, brick);
				checkRepeaterDepth(
					"brick",
					brick.key,
					getFieldBuilderState(brick).meta.repeaterDepth,
				);
				checkOpenRepeaters(
					"brick",
					brick.key,
					getFieldBuilderState(brick).repeaterStack,
				);
			}
		}

		checkCollectionEnvironmentVersionMap(configRes);
	}

	await initializeLogger({
		transport: configRes.logger.transport,
		level: configRes.logger.level,
	});

	return configRes;
};

export default processConfig;
