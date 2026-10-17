import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { Translator } from "../i18n/types.js";
import type { ResourceFile, ResourceSources } from "../resources/types.js";
import type {
	AdapterRuntimeContext,
	ConfigTransform,
	EnvironmentVariables,
	LucidConfigDefinition,
	RuntimeArtifactCustom,
	RuntimeBuildArtifactCompile,
	RuntimeBuildArtifactFile,
} from "../runtime/types.js";
import type { Toolkit, ToolkitDefinition } from "../toolkit/types.js";

export type LucidPluginRuntimeHookResult = {
	artifacts?: Array<
		| RuntimeBuildArtifactFile
		| RuntimeBuildArtifactCompile
		| RuntimeArtifactCustom
	>;
};

export type LucidPluginHookInit = () => ServiceResponse<undefined>;
export type LucidPluginRuntimeHookContext =
	| {
			phase: "prepare";
			env: EnvironmentVariables;
			definition: LucidConfigDefinition;
			paths: {
				configPath: string;
				projectRoot: string;
			};
	  }
	| {
			phase: "build";
			definition: LucidConfigDefinition;
			paths: {
				configPath: string;
				outputPath: string;
				outputRelativeConfigPath: string;
			};
	  };
export type LucidPluginRuntimeHookPhase =
	LucidPluginRuntimeHookContext["phase"];
export type LucidPluginHookRuntime = (
	props: LucidPluginRuntimeHookContext,
) => ServiceResponse<LucidPluginRuntimeHookResult>;

export type LucidPluginHooks = {
	/**
	 * Runs while loading configuration. Return a service result; an error stops initialization.
	 */
	init?: LucidPluginHookInit;
	/**
	 * Supplies files or runtime-specific artifacts for preparation and builds. Check `phase` to choose which artifacts to return.
	 */
	runtime?: LucidPluginHookRuntime;
};

/** Writes a plugin command's output to the terminal. */
export type LucidPluginCommandLogger = {
	info: (message: string) => void;
	warn: (message: string) => void;
	error: (error: unknown, heading: string) => void;
};

/** Runs plugin CLI commands with a database connection, KV and toolkit; run `lucidcms migrate` first when needed and throw to fail. */
export type LucidPluginCommand = {
	/** Plugin command name, such as `site:build`, which cannot replace a built-in command. */
	name: string;
	description: string;
	run: (props: {
		config: ResolvedLucidConfig;
		context: ServiceContext;
		toolkit: Toolkit;
		/** Public directory and `sources.public` files, with `path` naming each file on disk and `name` its public path. */
		publicFiles: ResourceFile[];
		logger: LucidPluginCommandLogger;
	}) => void | Promise<void>;
};

/** A callback that mutates the resolved configuration draft. */
export type PluginConfigure = ConfigTransform;

/** Fallback project settings. Explicit project values take precedence. */
export type PluginDefaults = Omit<Partial<LucidConfig>, "plugins">;

/** A plugin returned by `definePlugin` and registered in project config. */
export type LucidPluginDefinition = {
	/** Additional resources supplied by this plugin. Use exported package subpaths or file URLs. */
	sources?: ResourceSources;
	/**
	 * The unique key of the plugin.
	 */
	key: string;
	/**
	 * The Lucid CMS semver range that the plugin is compatible with.
	 */
	lucid: string;
	/**
	 * The hooks that the plugin can register.
	 */
	hooks?: LucidPluginHooks;
	/**
	 * CLI commands the plugin adds, such as `site:build`.
	 */
	commands?: LucidPluginCommand[];
	/**
	 * Can be used to check if the plugin is compatible with the current runtime context and state of the config.
	 *
	 * If the plugin is not compatible, you can throw either a LucidError or standard Error.
	 */
	checkCompatibility?: (props: {
		runtimeContext: AdapterRuntimeContext;
		config: ResolvedLucidConfig;
		translate: Translator;
	}) => void | Promise<void>;
	/**
	 * A plugin-owned service to add to Lucid's server toolkit.
	 */
	toolkit?: ToolkitDefinition;
	/**
	 * Mutate the resolved config draft after plugin defaults and project settings are applied. The project configure callback runs last.
	 */
	configure?: PluginConfigure;
	/** Supplies defaults before explicit project settings are applied. */
	defaults?: PluginDefaults | ((config: ResolvedLucidConfig) => PluginDefaults);
};

/** Factory accepting plugin-specific options and returning a plugin definition. */
export type LucidPlugin<T = undefined> = (
	pluginOptions: T,
) => LucidPluginDefinition;
