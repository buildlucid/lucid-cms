import type { ZodType } from "zod";
import { LucidError } from "../../utils/errors/index.js";
import validateEnvVars from "../cli/services/validate-env-vars.js";
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
	renderEmailTemplates?: boolean;
	envSchema?: ZodType;
	configureLucidPath?: string;
	prepareRuntime?: boolean;
}): Promise<LoadBuildProjectResult> => {
	const configPath = props?.configPath ?? getConfigPath(process.cwd());
	const loaded = await loadConfigFile({
		path: configPath,
		silent: props?.silent,
		configureLucidPath: props?.configureLucidPath,
		prepareRuntime: props?.prepareRuntime,
	});
	const translations = await prepareTranslations({
		config: loaded.config,
		projectRoot: loaded.projectRoot,
	});
	const preparedLoaded = {
		...loaded,
		translationStore: translations.translationStore,
	};

	const [envValid, _typeGen, emailTemplates] = await Promise.all([
		props?.validateEnv &&
			validateEnvVars({
				envSchema: props.envSchema ?? preparedLoaded.envSchema,
				env: preparedLoaded.env,
			}),
		props?.generateTypes !== false &&
			generateTypes({
				envSchema: props?.envSchema ?? preparedLoaded.envSchema,
				configPath,
				projectRoot: preparedLoaded.projectRoot,
				collections: preparedLoaded.config.collections,
				localization: preparedLoaded.config.localization,
			}),
		props?.renderEmailTemplates
			? import("../email/templates/render-mjml-templates.js").then(
					({ default: renderEmailTemplates }) =>
						renderEmailTemplates({
							config: preparedLoaded.config,
							silent: props?.silent,
						}),
				)
			: undefined,
	]);

	if (props?.validateEnv && !envValid) {
		throw new LucidError({
			message:
				"Lucid build could not validate the environment variables for lucid.config.ts.",
		});
	}

	return {
		configPath,
		loaded: preparedLoaded,
		emailTemplates,
	};
};

export default loadBuildProject;
