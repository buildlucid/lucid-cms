import type { ZodType } from "zod";
import { LucidError } from "../../utils/errors/index.js";
import validateEnvVars from "../cli/services/validate-env-vars.js";
import getConfigPath from "../config/get-config-path.js";
import loadConfigFile from "../config/load-config-file.js";
import type { RenderedTemplates } from "../email-adapter/types.js";
import generateTypes from "../type-generation/index.js";

type LoadConfigResult = Awaited<ReturnType<typeof loadConfigFile>>;

export type LoadBuildProjectResult = {
	configPath: string;
	loaded: LoadConfigResult;
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
}): Promise<LoadBuildProjectResult> => {
	const configPath = props?.configPath ?? getConfigPath(process.cwd());
	const loaded = await loadConfigFile({
		path: configPath,
		silent: props?.silent,
		configureLucidPath: props?.configureLucidPath,
	});

	const [envValid, _typeGen, emailTemplates] = await Promise.all([
		props?.validateEnv &&
			validateEnvVars({
				envSchema: props.envSchema ?? loaded.envSchema,
				env: loaded.env,
			}),
		props?.generateTypes !== false &&
			generateTypes({
				envSchema: props?.envSchema ?? loaded.envSchema,
				configPath,
				adapterModule: loaded.definition.adapter.module,
				databaseModule: loaded.definition.database.module,
				collections: loaded.config.collections,
				localization: loaded.config.localization,
			}),
		props?.renderEmailTemplates
			? import("../email-adapter/templates/render-mjml-templates.js").then(
					({ default: renderEmailTemplates }) =>
						renderEmailTemplates({
							config: loaded.config,
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
		loaded,
		emailTemplates,
	};
};

export default loadBuildProject;
