import path from "node:path";
import { LucidError } from "@lucidcms/core";
import {
	checkAllPluginsCompatibility,
	loadBuildProject,
	migrateCommand,
} from "@lucidcms/core/build";
import type {
	LucidAstroBridge,
	LucidAstroIntegrationBridge,
} from "../types.js";

type BuildProject = Awaited<ReturnType<typeof loadBuildProject>>;

/** Fully resolved Lucid project state used by the Astro integration hooks. */
export type ResolvedLucidProject = BuildProject & {
	bridge: LucidAstroBridge;
	integrationBridge: LucidAstroIntegrationBridge;
	bridgeEntrypoint: string;
	hostId: string;
};

const loadBridge = async (entrypoint: string): Promise<LucidAstroBridge> => {
	const module = (await import(
		/* @vite-ignore */
		entrypoint
	)) as {
		default?: LucidAstroBridge;
	};
	const bridge = module.default;

	if (
		!bridge ||
		typeof bridge.resolveRuntime !== "function" ||
		typeof bridge.handle !== "function"
	) {
		throw new LucidError({
			message: `The runtime Astro bridge at ${entrypoint} is invalid.`,
		});
	}

	return bridge;
};

/** Loads the Lucid project and the configured runtime's Astro bridges. */
export const loadProject = async (
	configPath: string,
): Promise<ResolvedLucidProject> => {
	const project = await loadBuildProject({
		configPath,
		silent: true,
		collectConfigDependencies: true,
		validateEnv: true,
		prepareRuntime: true,
		loadEmailTemplates: true,
	});
	const bridgeEntrypoint = project.loaded.adapter.hosts?.astro?.entrypoint;
	const integrationEntrypoint =
		project.loaded.adapter.hosts?.astro?.integrationEntrypoint;

	if (!bridgeEntrypoint) {
		throw new LucidError({
			message: `The ${project.loaded.adapter.key} runtime does not expose an Astro bridge.`,
		});
	}

	if (!project.emailTemplates) {
		throw new LucidError({
			message: "Lucid could not prepare the Astro email templates.",
		});
	}

	const bridge = await loadBridge(bridgeEntrypoint);
	const integrationModule = integrationEntrypoint
		? ((await import(
				/* @vite-ignore */
				integrationEntrypoint
			)) as {
				default?: LucidAstroIntegrationBridge;
			})
		: undefined;
	const integrationBridge =
		integrationModule?.default ??
		(bridge as unknown as LucidAstroIntegrationBridge);

	if (typeof integrationBridge.validateAdapter !== "function") {
		throw new LucidError({
			message: `The runtime Astro integration bridge for ${project.loaded.adapter.key} is invalid.`,
		});
	}

	return {
		...project,
		bridge,
		integrationBridge,
		bridgeEntrypoint,
		hostId: `${path.resolve(configPath)}:${project.loaded.adapter.key}`,
	} satisfies ResolvedLucidProject;
};

/** Checks Lucid plugin compatibility against the hosted runtime context. */
export const checkProjectCompatibility = async (
	project: ResolvedLucidProject,
	compiled: boolean,
) => {
	const state = await project.bridge.resolveRuntime({
		adapter: project.loaded.adapter,
		fallbackEnv: project.loaded.env,
		compiled,
	});
	await checkAllPluginsCompatibility({
		config: project.loaded.config,
		runtimeContext: state.runtimeContext,
	});
};

/** Runs Lucid migrations and sync tasks before the Astro development server starts. */
export const bootstrapDevProject = async (project: ResolvedLucidProject) => {
	const state = await project.bridge.resolveRuntime({
		adapter: project.loaded.adapter,
		fallbackEnv: project.loaded.env,
		compiled: false,
	});
	const result = await migrateCommand({
		config: project.loaded.config,
		env: state.env ?? project.loaded.env,
		runtimeContext: state.runtimeContext,
		translationStore: project.loaded.translationStore,
		mode: "return",
	})({
		skipEnvValidation: true,
		skipSyncSteps: false,
	});

	if (!result) {
		throw new LucidError({
			message: "Lucid could not prepare the schema for Astro dev.",
		});
	}
};
