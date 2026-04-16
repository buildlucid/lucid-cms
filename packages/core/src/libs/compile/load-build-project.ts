import type { ZodType } from "zod";
import validateEnvVars from "../cli/services/validate-env-vars.js";
import getConfigPath from "../config/get-config-path.js";
import loadConfigFile from "../config/load-config-file.js";
import renderMjmlTemplates from "../email-adapter/templates/render-mjml-templates.js";
import generateTypes from "../type-generation/index.js";

type LoadConfigResult = Awaited<ReturnType<typeof loadConfigFile>>;
type RenderedTemplates = Awaited<
	ReturnType<
		typeof import("../email-adapter/templates/render-mjml-templates.js")["default"]
	>
>;

export type LoadBuildProjectResult = {
	configPath: string;
	loaded: LoadConfigResult;
	emailTemplates?: RenderedTemplates;
};

const loadBuildProject = async (props?: {
	configPath?: string;
	silent?: boolean;
	validateEnv?: boolean;
	generateTypes?: boolean;
	renderEmailTemplates?: boolean;
	envSchema?: ZodType;
}): Promise<LoadBuildProjectResult> => {
	const configPath = props?.configPath ?? getConfigPath(process.cwd());
	const loaded = await loadConfigFile({
		path: configPath,
		silent: props?.silent,
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
			}),
		props?.renderEmailTemplates
			? renderMjmlTemplates({
					config: loaded.config,
					silent: props?.silent,
				})
			: undefined,
	]);

	if (props?.validateEnv && !envValid) {
		throw new Error(
			"Lucid build could not validate the environment variables for lucid.config.ts.",
		);
	}

	return {
		configPath,
		loaded,
		emailTemplates,
	};
};

export default loadBuildProject;
