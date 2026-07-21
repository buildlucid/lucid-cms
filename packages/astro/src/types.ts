import type {
	AdapterRuntimeContext,
	Config,
	EnvironmentVariables,
	HttpExtension,
	LucidConfigDefinition,
	LucidHost,
	RuntimeAdapter,
	TranslationStore,
} from "@lucidcms/core/types";

/** Runtime-specific state resolved for an Astro execution context. */
export type LucidAstroRuntimeState = {
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	/** Platform execution context forwarded to the runtime bridge. */
	executionContext?: unknown;
	/** Separates host instances when a runtime serves multiple environments. */
	cacheKey?: string | object;
	http?: {
		extensions?: HttpExtension[];
	};
};

/** Request-time contract implemented by runtime adapters that support Astro. */
export type LucidAstroBridge = {
	name: string;
	/** Resolves the platform state needed to create or reuse a Lucid host. */
	resolveRuntime(props: {
		adapter: RuntimeAdapter;
		context?: unknown;
		fallbackEnv?: EnvironmentVariables;
		compiled: boolean;
	}): LucidAstroRuntimeState | Promise<LucidAstroRuntimeState>;
	/** Passes an Astro request through the hosted Lucid application. */
	handle(props: {
		host: LucidHost;
		context: {
			request: Request;
		};
		state: LucidAstroRuntimeState;
	}): Response | Promise<Response>;
	/** Handles an optional platform scheduled event. */
	scheduled?(props: {
		host: LucidHost;
		controller: { cron: string };
		state: LucidAstroRuntimeState;
	}): void | Promise<void>;
};

export type LucidAstroPrepareResult = {
	/** Generated files that should not trigger another Vite restart. */
	ignoredWatchFiles?: string[];
};

/** Build-time contract for platform-specific Astro preparation. */
export type LucidAstroIntegrationBridge = {
	vite?: {
		aliases?: Record<string, string>;
		ssrExternal?: string[];
	};
	/** Ensures the configured Astro adapter matches the Lucid runtime. */
	validateAdapter(adapter: { name: string } | undefined): void;
	/** Prepares platform artifacts after Lucid generates its runtime modules. */
	prepare?(props: {
		command: "dev" | "build" | "sync";
		adapter: RuntimeAdapter;
		configPath: string;
		projectRoot: string;
		generatedDirectory: string;
		runtimeModulePath: string;
		config: Config;
		translationStore: TranslationStore;
		definition: LucidConfigDefinition;
	}):
		| undefined
		| LucidAstroPrepareResult
		| Promise<LucidAstroPrepareResult | undefined>;
	/** Applies platform-specific changes to the completed Astro build. */
	buildDone?(props: { directory: string }): void | Promise<void>;
};

/** Options accepted by the Lucid Astro integration. */
export type LucidAstroOptions = {
	/** Path to `lucid.config.*`. Defaults to the config found from the current directory. */
	configPath?: string;
};
