import type {
	AdapterRuntimeContext,
	DatabaseConnectionScope,
	EnvironmentVariables,
	HttpExtension,
	LucidInvocation,
} from "@lucidcms/core/types";
import type { LucidViteProject } from "@lucidcms/core/vite";
import type { AstroConfig } from "astro";

type SsrEnvironment = NonNullable<AstroConfig["vite"]["environments"]>[string];
type VitePluginOption = NonNullable<AstroConfig["vite"]["plugins"]>[number];

/** Runtime-specific state resolved for an Astro execution context. */
export type LucidAstroRuntimeState = {
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	/** Controls whether the live database connection belongs to the runtime or invocation. */
	databaseScope: DatabaseConnectionScope;
	/** Platform execution context forwarded to the runtime bridge. */
	executionContext?: unknown;
	/** Separates runtime hosts when one runtime module serves multiple environments. */
	cacheKey?: string | object;
	http?: {
		extensions?: HttpExtension[];
	};
};

/** Request context required to resolve an invocation-safe Lucid toolkit. */
export type LucidAstroContext = {
	request: Request;
	url: URL;
	locals: object;
};

/** Request-time contract implemented by runtime adapters that support Astro. */
export type LucidAstroBridge = {
	name: string;
	/** Resolves the platform state needed to create or reuse a Lucid host. */
	resolveRuntime(props: {
		context?: unknown;
		compiled: boolean;
	}): LucidAstroRuntimeState | Promise<LucidAstroRuntimeState>;
	/** Passes an Astro request through the hosted Lucid application. */
	handle(props: {
		invocation: LucidInvocation;
		context: {
			request: Request;
		};
		state: LucidAstroRuntimeState;
	}): Response | Promise<Response>;
};

/** Vite settings a runtime's Astro integration adds to Astro's config. */
export type LucidAstroViteOptions = {
	/** Plugins serving platform modules, such as a Worker entry that imports Lucid's runtime module. */
	plugins?: VitePluginOption[];
	aliases?: Record<string, string>;
	/** Platform settings for Astro's server environment. */
	ssrEnvironment?: Pick<SsrEnvironment, "optimizeDeps" | "build">;
};

/** Build-time contract for platform-specific Astro support. */
export type LucidAstroIntegrationBridge = {
	/** Ensures the configured Astro adapter matches the Lucid runtime. */
	validateAdapter(adapter: { name: string } | undefined): void;
	/** Vite settings for Astro's config, given the project and the ID of Lucid's runtime module. */
	vite?(props: {
		command: "dev" | "build" | "sync";
		/** The project Lucid's Vite plugin loaded. */
		project: LucidViteProject;
		runtimeModuleId: string;
	}): LucidAstroViteOptions;
};

/** Options accepted by the Lucid Astro integration. */
export type LucidAstroOptions = {
	/** Path to `lucid.config.*`. Defaults to the config found from the current directory. */
	configPath?: string;
};
