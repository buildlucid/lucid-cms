import path from "node:path";
import getConfigPath from "../config/get-config-path.js";
import loadConfigFile from "../config/load-config-file.js";
import prepareTranslations from "../i18n/prepare-translations.js";
import collectRuntimeArtifacts from "./collect-runtime-artifacts.js";
import listEnvVariables from "./list-env-variables.js";
import loadRuntimeIntegration from "./load-runtime-integration.js";
import resolveEnvMode from "./resolve-env-mode.js";
import type { LucidViteProject, RuntimeViteIntegration } from "./types.js";

/** Loads config and runtime integration in Node for Vite, `typegen` and helpers such as Cloudflare's, preserving rejected env values until host validation and defaulting `configPath` to the nearest `lucid.config.*` at or above the working directory and `mode` to `production` when `NODE_ENV` is `production`, otherwise `development`. */
const loadProject = async (configPath?: string, mode?: string) => {
	const resolvedPath = path.resolve(configPath ?? getConfigPath(process.cwd()));
	const projectRoot = path.dirname(resolvedPath);

	// The integration loads the env once the config names its adapter, and is kept for the project.
	let integration: RuntimeViteIntegration | undefined;
	const loaded = await loadConfigFile({
		path: resolvedPath,
		collectConfigDependencies: true,
		validateEnvSchema: false,
		// Node only reads the config here, so secrets may only exist in the runtime, and warnings from plugins setting
		// up are left to the runtime to report.
		processConfigOptions: { mode: "build", logger: { level: "error" } },
		loadEnv: async (adapter) => {
			integration = await loadRuntimeIntegration(adapter, projectRoot);
			return integration.loadEnv?.({
				adapter,
				projectRoot,
				mode: resolveEnvMode(mode),
			});
		},
	});

	const [runtimeIntegration, translations] = await Promise.all([
		integration ?? loadRuntimeIntegration(loaded.adapter, projectRoot),
		prepareTranslations({
			config: loaded.config,
			files: loaded.resources.files.translations,
		}),
	]);

	const project: LucidViteProject = {
		...loaded,
		translationStore: translations.translationStore,
		envVariables: listEnvVariables(loaded.envSchema),
		artifacts: await collectRuntimeArtifacts({
			loaded,
			translationStore: translations.translationStore,
		}),
	};

	return { project, integration: runtimeIntegration };
};

export default loadProject;
