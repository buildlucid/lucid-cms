import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ZodType } from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import cliLogger from "../cli/logger.js";
import loadEmailTemplates from "../email/templates/load-email-templates.js";
import type { RenderedTemplates } from "../email/types.js";
import {
	emptyPreparedResources,
	prepareResources,
} from "../resources/prepare-resources.js";
import type { PreparedResources } from "../resources/types.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdapter,
} from "../runtime/types.js";
import getConfigPath from "./get-config-path.js";
import { resolveConfigDefinition } from "./resolve-config-definition.js";
import loadConfigModule from "./utils/load-config-module.js";
import withConfigLoader from "./utils/with-config-loader.js";

export type LoadConfigResult = {
	configPath: string;
	resources: PreparedResources;
	/** Local source modules imported by the config when dependency collection is enabled. */
	configDependencies: string[];
	projectRoot: string;
	runtimeContext: AdapterRuntimeContext;
	config: ResolvedLucidConfig;
	adapter: RuntimeAdapter;
	envSchema?: ZodType;
	env: EnvironmentVariables | undefined;
	/** Original values for integrations that create another runtime host. */
	rawEnv: Record<string, unknown> | undefined;
	definition: LucidConfigDefinition;
	/** The project's email templates, which the resolved config renders emails with. */
	emailTemplates: RenderedTemplates;
};

const loadConfigFile = async (props?: {
	path?: string;
	silent?: boolean;
	meta?: LucidConfigDefinitionMeta;
	/** Collects local config imports for development watchers. */
	collectConfigDependencies?: boolean;
	/** False keeps env values the schema rejects raw, rather than failing, for reading the config in Node. */
	validateEnvSchema?: boolean;
	/** Overrides the named env export before raw environment values are parsed. */
	envSchema?: ZodType;
	/** Loads environment values once the adapter resolves, instead of the adapter's own `getEnvVars`. */
	loadEnv?: Parameters<typeof resolveConfigDefinition>[0]["loadEnv"];
	processConfigOptions?: Parameters<
		typeof resolveConfigDefinition
	>[0]["processConfigOptions"];
}): Promise<LoadConfigResult> => {
	const configPath = path.resolve(
		props?.path ? props.path : getConfigPath(process.cwd()),
	);
	const projectRoot = path.dirname(configPath);
	const importPath = pathToFileURL(configPath).href;
	const collectConfigDependencies = props?.collectConfigDependencies ?? false;

	return withConfigLoader(async (jiti) => {
		const { module: configModule, dependencies: configDependencies } =
			await loadConfigModule<{
				default: unknown;
				env?: ZodType;
			}>({
				loader: jiti,
				specifier: importPath,
				dependencyEntryPath: collectConfigDependencies ? configPath : undefined,
			});

		const hasNamedEnvExport = Object.hasOwn(configModule, "env");
		let resources = emptyPreparedResources();

		// Runtimes apply `meta.emailTemplates` while processing the config, after the raw config reveals its resources.
		const meta: LucidConfigDefinitionMeta = { ...props?.meta };
		const resolved = await resolveConfigDefinition({
			onRawConfig: async (config) => {
				resources = await prepareResources(config, projectRoot);
				meta.emailTemplates ??= await loadEmailTemplates({
					files: resources.files.emails,
					silent: true,
				});
			},
			definition: configModule.default,
			envSchema:
				props?.envSchema ?? (hasNamedEnvExport ? configModule.env : undefined),
			loadEnv: props?.loadEnv,
			meta,
			validateEnvSchema: props?.validateEnvSchema,
			logger: {
				instance: cliLogger,
				silent: props?.silent ?? false,
			},
			processConfigOptions: props?.processConfigOptions,
		});

		return {
			configPath,
			configDependencies,
			resources,
			projectRoot,
			runtimeContext: resolved.runtimeContext,
			config: resolved.config,
			adapter: resolved.adapter,
			envSchema: resolved.envSchema,
			env: resolved.env,
			rawEnv: resolved.rawEnv,
			definition: resolved.definition,
			emailTemplates: meta.emailTemplates ?? {},
		};
	}, projectRoot);
};

export default loadConfigFile;
