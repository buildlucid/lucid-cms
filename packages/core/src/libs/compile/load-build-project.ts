import type { ZodType } from "zod";
import getConfigPath from "../config/get-config-path.js";
import loadConfigFile from "../config/load-config-file.js";
import type { RenderedTemplates } from "../email/types.js";
import prepareTranslations from "../i18n/prepare-translations.js";
import type { TranslationStore } from "../i18n/types.js";
import generateTypes from "../type-generation/index.js";

type LoadConfigResult = Awaited<ReturnType<typeof loadConfigFile>>;
type PreparedLoadConfigResult = LoadConfigResult & {
	translationStore: TranslationStore;
};

export type LoadBuildProjectResult = {
	configPath: string;
	loaded: PreparedLoadConfigResult;
	emailTemplates?: RenderedTemplates;
};

/**
 * Centralises the build-time Lucid bootstrap steps so CLI and integrations can
 * resolve the same config, env and generated side effects without duplicating
 * the setup sequence in each host.
 */
const loadBuildProject = async (props?: {
	configPath?: string;
	silent?: boolean;
	validateEnv?: boolean;
	generateTypes?: boolean;
	loadEmailTemplates?: boolean;
	/** Collects local config imports for development watchers. */
	collectConfigDependencies?: boolean;
	envSchema?: ZodType;
	adaptConfigPath?: string;
	prepareRuntime?: boolean;
}): Promise<LoadBuildProjectResult> => {
	const configPath = props?.configPath ?? getConfigPath(process.cwd());
	const loaded = await loadConfigFile({
		path: configPath,
		silent: props?.silent,
		collectConfigDependencies: props?.collectConfigDependencies,
		adaptConfigPath: props?.adaptConfigPath,
		prepareRuntime: props?.prepareRuntime,
		validateEnvSchema: props?.validateEnv ?? false,
		envSchema: props?.envSchema,
		processConfigOptions: {
			mode: "build",
		},
	});
	const translations = await prepareTranslations({
		config: loaded.config,
		files: loaded.resources.files.translations,
	});
	const preparedLoaded = {
		...loaded,
		translationStore: translations.translationStore,
	};

	const [_typeGen, emailTemplates] = await Promise.all([
		props?.generateTypes !== false &&
			generateTypes({
				envSchema: preparedLoaded.envSchema,
				configPath,
				projectRoot: preparedLoaded.projectRoot,
				access: preparedLoaded.config.access,
				collections: preparedLoaded.config.collections,
				localization: preparedLoaded.config.localization,
			}),
		props?.loadEmailTemplates
			? import("../email/templates/load-email-templates.js").then(
					({ default: loadEmailTemplates }) =>
						loadEmailTemplates({
							files: preparedLoaded.resources.files.templates,
							silent: props?.silent,
						}),
				)
			: undefined,
	]);

	return {
		configPath,
		loaded: preparedLoaded,
		emailTemplates,
	};
};

export default loadBuildProject;
