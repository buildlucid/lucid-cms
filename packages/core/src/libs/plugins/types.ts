import type { InlineConfig, PluginOption } from "vite";
import type z from "zod";
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
} from "../runtime/types.js";
import type { Toolkit, ToolkitDefinition } from "../toolkit/types.js";

export type LucidPluginRuntimeHookResult = {
	artifacts?: Array<RuntimeArtifactCustom>;
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
	/** Supplies runtime artifacts for preparation or builds according to `phase`. */
	runtime?: LucidPluginHookRuntime;
};

/** Writes a plugin command's output to the terminal. */
export type LucidPluginCommandLogger = {
	info: (message: string) => void;
	/** Prints `details` as indented lines under the warning, such as the items it's about. */
	warn: (message: string, details?: string[]) => void;
	error: (error: unknown, heading: string) => void;
};

/** Defines a plugin command's runtime work through `definePluginTask`, parsing JSON with `input` and returning JSON through the development task route with runtime bindings and services. */
export type LucidPluginTask<
	Input extends z.ZodType = z.ZodType,
	Result = unknown,
> = {
	input: Input;
	// A method, so tasks with their own input and result still fit `tasks`' record of any task.
	run(props: {
		context: ServiceContext;
		toolkit: Toolkit;
		input: z.output<Input>;
	}): Promise<Result>;
};

/** What a plugin task hands back to its command. */
export type LucidPluginTaskResult<Task extends LucidPluginTask> = Awaited<
	ReturnType<Task["run"]>
>;

/** Defines a Node `lucidcms` command with filesystem access and runtime `tasks`; run `lucidcms migrate` first when needed and throw to fail. */
export type LucidPluginCommand = {
	/** Plugin command name, such as `site:build`, which cannot replace a built-in command. */
	name: string;
	description: string;
	run: (props: {
		config: ResolvedLucidConfig;
		/** The folder holding lucid.config. */
		projectRoot: string;
		/** Public directory and `sources.public` files, with `path` naming each file on disk and `name` its public path. */
		publicFiles: ResourceFile[];
		/** Creates Vite config for builds with warnings/errors only, loading the project on demand and rejecting projects served by a framework. */
		viteConfig: () => Promise<InlineConfig>;
		/** Runs a plugin task in the runtime and returns its result, typed with the task definition as in `runTask<typeof buildTask>("build", input)`. */
		runTask: <Task extends LucidPluginTask = LucidPluginTask>(
			name: string,
			input: z.input<Task["input"]>,
		) => Promise<LucidPluginTaskResult<Task>>;
		logger: LucidPluginCommandLogger;
	}) => void | Promise<void>;
};

/** Commands that run plugin `prepare` hooks, with hosts such as Astro using `dev` and `build`. */
export type LucidPluginCliPrepareCommand = "dev" | "build" | "typegen";

/** What a plugin adds to the project's Vite app. */
export type LucidPluginVite = {
	/** Vite plugins for the project's Vite config. */
	plugins?: PluginOption[];
	/** Server module, including virtual modules supplied by `plugins`, whose exports reach `runtimeContext.pluginModules[key]` after the client builds so they can include its output. */
	module?: string;
};

/** What `lucidcms` calls at points in its own commands, as opposed to the commands a plugin adds. */
export type LucidPluginCliHooks = {
	/** Runs when `lucidcms dev` starts or restarts, and during `build` and `typegen`, for setup such as writing editor files. */
	prepare?: (props: {
		command: LucidPluginCliPrepareCommand;
		config: ResolvedLucidConfig;
		projectRoot: string;
	}) => void | Promise<void>;
	/** Adds the plugin to the project's Vite app, which `lucid()` runs during development, builds and previews. */
	vite?: (props: {
		config: ResolvedLucidConfig;
		projectRoot: string;
		/** The runtime adapter's key, such as `node` or `cloudflare`. */
		runtime: string;
	}) => LucidPluginVite | Promise<LucidPluginVite>;
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
	/** CLI-only Vite plugins and commands loaded from `module`, a package subpath or path exporting a `LucidPluginCliFactory` invoked with `options`. */
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
	/** Work the plugin's commands run inside the runtime, by name. */
	tasks?: Record<string, LucidPluginTask>;
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
