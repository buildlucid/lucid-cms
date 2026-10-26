import type { InlineConfig, PluginOption } from "vite";
import type { LoadConfigResult } from "../config/load-config-file.js";
import type { TranslationStore } from "../i18n/types.js";
import type {
	RuntimeAdapter,
	RuntimeArtifactCustom,
} from "../runtime/types.js";

/** Options for Lucid's Vite plugin. */
export type LucidViteOptions = {
	/** Path to `lucid.config.*`, defaulting to the nearest one at or above the working directory. */
	configPath?: string;
	/** Hosting framework, such as `astro`, that owns server plugins, settings, build order and Lucid routing including development `/__lucid/tasks/`, with Lucid serving the admin only during development. */
	host?: string;
	/** Built admin HTML for hosts that build it themselves, read during the server build. */
	adminDocument?: () => string | undefined;
	/** Host server build input identified by environment and input name, which runtimes can wrap with background work such as Lucid's job scheduler. */
	serverEntry?: { environment: string; input: string };
	/** Connects the runtime's bindings to their deployed resources, where the runtime supports it, for `--remote`. */
	remote?: boolean;
	/** Builds only for previewing locally, as `lucidcms serve` does, so runtimes may add settings deploys must not have. */
	preview?: boolean;
	/** Vite mode for project env loading, such as `production` builds, defaulting to `production` when `NODE_ENV` is `production`, otherwise `development`. */
	mode?: string;
	/** Whether to generate types, run plugin CLI `prepare` hooks and check compatibility during config resolution, defaulting to `true` and disabled for command task servers and build previews. */
	prepare?: boolean;
	/** Whether to compile the admin into the client environment, defaulting to `true` and disabled for plugin commands' builds. */
	admin?: boolean;
};

/** The project Lucid's Vite plugin loaded in Node, which runtime integrations configure Vite from. */
export type LucidViteProject<Adapter extends RuntimeAdapter = RuntimeAdapter> =
	Omit<LoadConfigResult, "adapter"> & {
		adapter: Adapter;
		translationStore: TranslationStore;
		/** Variables the project's `env` schema declares, for runtimes that declare them too, such as Cloudflare's secrets. */
		envVariables: Array<{ name: string; required: boolean }>;
		/** Runtime artifacts from the database adapter and plugins, limited to the types the runtime adapter declares. */
		artifacts: {
			/** Platform requirements, such as Cloudflare bindings. */
			prepare: RuntimeArtifactCustom[];
			/** Server additions, such as Cloudflare Worker event handlers. */
			build: RuntimeArtifactCustom[];
		};
	};

/** What Lucid's Vite plugin exposes through its `api`, for tools that drive Vite, such as Lucid's CLI. */
export type LucidViteApi = {
	project: LucidViteProject;
	/** Authenticates runtime task requests to this server, for tools that run Lucid's commands through it. */
	token: string;
	/** Development-only promise resolving whether startup migrations completed. */
	ready: Promise<boolean>;
	/** What Lucid's dev command shows while the server starts, from the runtime's Vite integration. */
	startMessage: string;
};

/** What `lucid()` gives each of its plugins. */
export type LucidPluginProps = Omit<LucidViteApi, "ready" | "startMessage"> & {
	/** Hosting framework such as `astro`, or undefined when Lucid serves itself. */
	host?: string;
};

/** What a framework serving Lucid gives Lucid's CLI, from the module its `HostAdapter.cli` names. */
export type HostCliIntegration = {
	/** The framework's name in messages, such as `Astro`. */
	name: string;
	/** Its commands to use instead of Lucid's server commands, which don't run when it serves Lucid. */
	commands: { dev: string; build: string; preview: string };
	/** Its development Vite config, with Lucid's plugin, for the servers Lucid's commands run tasks through. */
	viteConfig: (props: {
		configPath: string;
		/** Set by `--remote`, which the host may not support. */
		remote?: boolean;
	}) => Promise<InlineConfig>;
};

/** Default runtime `vite` export that runs and builds entries importing `lucid:build`, while Lucid supplies admin/public files and `handleDevTask` handles development `LucidBuild.dev` tasks. */
export type RuntimeViteIntegration<
	Adapter extends RuntimeAdapter = RuntimeAdapter,
> = {
	/** Loads env for Node config evaluation when `getEnvVars` is unsuitable for Vite, matching runtime values for `mode`, such as `production` builds. */
	loadEnv?: (props: {
		adapter: Adapter;
		projectRoot: string;
		mode: string;
	}) => Promise<Record<string, unknown>>;
	/** Startup message shown by Lucid's dev command, such as `Starting the Worker`, defaulting to `Starting the server`. */
	startMessage?: string;
	/** Dev and preview address from adapter options, with the port defaulting to 6543. */
	listen?: (
		adapter: Adapter,
	) => { port?: number; hostname?: string } | undefined;
	/** Plugins that run the server entry during development and build it for production. */
	plugins: (
		project: LucidViteProject<Adapter>,
		options: Pick<LucidViteOptions, "remote" | "preview">,
	) => PluginOption[] | Promise<PluginOption[]>;
	/** Support for running inside a framework's server, declared with `defineConfig({ host })`. */
	hosted?: {
		/** Module exporting `createHostedLucid(build)`, which returns the runtime's `HostedLucid`. */
		module: string;
		/** Plugins that add Lucid's background work, such as its job scheduler, around the host's server. */
		plugins: (
			project: LucidViteProject<Adapter>,
			options: Pick<LucidViteOptions, "serverEntry">,
		) => PluginOption[] | Promise<PluginOption[]>;
	};
};
