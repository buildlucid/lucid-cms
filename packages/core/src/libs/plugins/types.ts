import type { IncomingMessage, Server, ServerResponse } from "node:http";
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
	/** Prints `details` as indented lines under the warning, such as the items it's about. */
	warn: (message: string, details?: string[]) => void;
	error: (error: unknown, heading: string) => void;
};

/** Runs plugin CLI commands with a database connection, KV and toolkit; run `lucidcms migrate` first when needed and throw to fail. */
export type LucidPluginCommand = {
	/** Plugin command name, such as `site:build`, which cannot replace a built-in command. */
	name: string;
	description: string;
	run: (props: {
		config: ResolvedLucidConfig;
		/** The folder holding lucid.config. */
		projectRoot: string;
		context: ServiceContext;
		toolkit: Toolkit;
		/** Public directory and `sources.public` files, with `path` naming each file on disk and `name` its public path. */
		publicFiles: ResourceFile[];
		logger: LucidPluginCommandLogger;
	}) => void | Promise<void>;
};

/** Connect-style middleware for the development HTTP server. Call `next` for requests it doesn't handle. */
export type LucidDevMiddleware = (
	request: IncomingMessage,
	response: ServerResponse,
	next: (error?: unknown) => void,
) => void;

/** Development services a plugin starts, such as a Vite server. */
export type LucidPluginCliDev = {
	middleware?: LucidDevMiddleware;
	close?: () => Promise<void>;
	/** Passed to the plugin's runtime code as `runtimeContext.pluginData[key]`. */
	data?: unknown;
};

/** The `lucidcms` commands that run plugins' `prepare` hooks. */
export type LucidPluginCliPrepareCommand =
	| "dev"
	| "serve"
	| "build"
	| "typegen";

/** What `lucidcms` calls at points in its own commands, as opposed to the commands a plugin adds. */
export type LucidPluginCliHooks = {
	/** Runs during `lucidcms dev` (each restart too), `serve`, `build` and `typegen`, for setup such as writing editor files. */
	prepare?: (props: {
		command: LucidPluginCliPrepareCommand;
		config: ResolvedLucidConfig;
		projectRoot: string;
	}) => void | Promise<void>;
	/** Runs during `lucidcms dev`, each time it starts the server, for development services such as a Vite server. */
	dev?: (props: {
		server: Server;
		config: ResolvedLucidConfig;
		projectRoot: string;
	}) => Promise<LucidPluginCliDev>;
	/**
	 * Runs during `lucidcms build` and `lucidcms serve`, for the plugin's own build, such as its assets. Not the plugin's
	 * `hooks.runtime`, whose `build` phase gives the runtime adapter artifacts. Returned `data` reaches runtime code as
	 * `runtimeContext.pluginData[key]`, and the exports of an absolute ES `module` written under `outDir`, such as bundled
	 * components, as `runtimeContext.pluginModules[key]`.
	 */
	build?: (props: {
		config: ResolvedLucidConfig;
		projectRoot: string;
		/** The runtime adapter's key, such as `node` or `cloudflare`. */
		runtime: string;
		/** Public directory and `sources.public` files, with `path` naming each file on disk and `name` its public path. */
		publicFiles: ResourceFile[];
		/** Absolute output directory; files under `public` are served from the site root. */
		outDir: string;
	}) => Promise<{ data?: unknown; module?: string } | undefined>;
};

/** CLI-only plugin code, kept out of server bundles because core loads it by module path. */
export type LucidPluginCli = {
	/** What `lucidcms` calls during its own commands. */
	hooks?: LucidPluginCliHooks;
	/** Commands the plugin adds to `lucidcms`, such as `site:build`. */
	commands?: LucidPluginCommand[];
};

/** The default export of a plugin's CLI module, given the options the plugin passes in `cli.options`. */
export type LucidPluginCliFactory<Options = undefined> = (
	options: Options,
) => LucidPluginCli;

/** A callback that mutates the resolved configuration draft. */
export type PluginConfigure = ConfigTransform;

/** Fallback project settings. Explicit project values take precedence. */
export type PluginDefaults = Omit<Partial<LucidConfig>, "plugins">;

/** A plugin returned by `definePlugin` and registered in project config. */
export type LucidPluginDefinition = {
	/** Additional resources supplied by this plugin. Use exported package subpaths or file URLs. */
	sources?: ResourceSources;
	/**
	 * Unique key using the package name for published plugins, such as `@acme/lucid-seo`, to avoid clashes, or a short project key such as `site-brand`.
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
	 * CLI-only code, such as dev servers and asset builds. `module` is a package subpath or path whose default export is a `LucidPluginCliFactory`, called with `options`.
	 */
	cli?: {
		module: string;
		options?: unknown;
	};
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
