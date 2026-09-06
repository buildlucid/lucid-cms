import { produce } from "immer";
import defaultConfig from "../../constants/default-config.js";
import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { translate } from "../i18n/index.js";
import type { ConfigTransform } from "../runtime/types.js";
import ConfigSchema from "./config-schema.js";
import mergeConfig from "./merge-config.js";
import createProviderRegistry from "./utils/create-provider-registry.js";
import normalizeConfigSecrets from "./utils/normalize-config-secrets.js";

/** Resolves defaults, then applies plugin transformations and the final project callback. */
const resolveConfig = async (
	config: LucidConfig,
	options: {
		resolvedDb: DatabaseAdapter;
		skipValidation?: boolean;
		mode?: "runtime" | "build";
		configure?: ConfigTransform;
	},
): Promise<ResolvedLucidConfig> => {
	let defaults = mergeConfig({}, defaultConfig);
	const resolvedDb = options.resolvedDb;

	const resolve = () => {
		const merged = normalizeConfigSecrets(
			mergeConfig(config, defaults),
			options.skipValidation ? "build" : options.mode,
		);
		return ConfigSchema.parse({
			...merged,
			db: resolvedDb,
			collections: merged.collections?.map((collection) => collection.clone()),
		});
	};
	let configRes = resolve();

	const pluginKeys = new Set<string>();
	const registerProviders = createProviderRegistry();

	for (const plugin of configRes.plugins) {
		if (pluginKeys.has(plugin.key))
			throw new LucidError({
				message: `Plugin "${plugin.key}" is registered more than once.`,
			});
		pluginKeys.add(plugin.key);
		const values =
			typeof plugin.defaults === "function"
				? plugin.defaults(configRes)
				: plugin.defaults;
		if (!values) continue;
		registerProviders(plugin.key, values);
		defaults = mergeConfig(values, defaults);
		configRes = resolve();
	}

	for (const pluginDef of configRes.plugins) {
		if (!options.skipValidation) {
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

		if (pluginDef.configure) {
			const before = configRes;
			configRes = produce<ResolvedLucidConfig, ResolvedLucidConfig>(
				configRes,
				pluginDef.configure,
			);
			registerProviders(pluginDef.key, configRes, before);
		}
	}

	if (options.configure) {
		configRes = produce<ResolvedLucidConfig, ResolvedLucidConfig>(
			configRes,
			options.configure,
		);
	}
	configRes = ConfigSchema.parse(
		normalizeConfigSecrets(configRes, options.mode),
	);

	return configRes;
};

export default resolveConfig;
