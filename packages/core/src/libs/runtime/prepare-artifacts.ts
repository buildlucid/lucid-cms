import type {
	DatabaseAdapterCreator,
	DatabaseAdapterFactory,
} from "../db/adapter-factory.js";
import type { LucidPluginResponse } from "../plugins/types.js";
import type {
	DatabaseAdapterValue,
	EnvironmentVariables,
	LucidConfigDefinition,
	RuntimeArtifactCustom,
	RuntimeArtifactProvider,
	RuntimeBuildArtifact,
	RuntimePrepareArtifacts,
} from "./types.js";

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
	(typeof value === "object" || typeof value === "function") &&
	value !== null &&
	"then" in value;

/** Detects adapter factories so core can read runtime setup metadata before resolving the adapter. */
const isDatabaseAdapterFactory = (
	value: unknown,
): value is DatabaseAdapterFactory => {
	if (!value || (typeof value !== "object" && typeof value !== "function")) {
		return false;
	}

	const factory = value as Partial<DatabaseAdapterFactory> &
		Partial<DatabaseAdapterCreator>;

	if (
		typeof value === "function" &&
		factory.__lucidDatabaseAdapterCreator !== true
	) {
		return false;
	}

	return (
		typeof factory.adapter === "string" && typeof factory.resolve === "function"
	);
};

/** Creates the empty artifact payload passed into runtime prepare handlers. */
export const createRuntimePrepareArtifacts = (): RuntimePrepareArtifacts => ({
	custom: [],
});

/** Resolves static or env-aware artifact providers used by database adapters. */
const resolvePrepareArtifacts = async (
	provider: RuntimeArtifactProvider | undefined,
	env: EnvironmentVariables,
): Promise<Array<RuntimeArtifactCustom>> => {
	if (!provider) return [];
	return typeof provider === "function" ? provider(env) : provider;
};

const isCustomArtifact = (
	artifact: RuntimeBuildArtifact | RuntimeArtifactCustom,
): artifact is RuntimeArtifactCustom => "custom" in artifact;

/** Adds only custom artifacts that the active runtime explicitly supports. */
const addSupportedArtifacts = (props: {
	target: RuntimePrepareArtifacts;
	artifacts: Array<RuntimeBuildArtifact | RuntimeArtifactCustom>;
	customArtifactTypes?: string[];
}) => {
	if (!props.customArtifactTypes?.length) {
		return;
	}

	for (const artifact of props.artifacts) {
		if (
			isCustomArtifact(artifact) &&
			props.customArtifactTypes.includes(artifact.type)
		) {
			props.target.custom.push(artifact);
		}
	}
};

const collectDatabasePrepareArtifacts = async (props: {
	db: DatabaseAdapterValue;
	env: EnvironmentVariables;
	target: RuntimePrepareArtifacts;
	customArtifactTypes?: string[];
}) => {
	const resolvedValue = isPromiseLike(props.db) ? await props.db : props.db;
	if (!isDatabaseAdapterFactory(resolvedValue)) {
		return;
	}

	addSupportedArtifacts({
		target: props.target,
		artifacts: await resolvePrepareArtifacts(
			resolvedValue.hooks?.runtime,
			props.env,
		),
		customArtifactTypes: props.customArtifactTypes,
	});
};

const collectPluginPrepareArtifacts = async (props: {
	plugins: Array<LucidPluginResponse>;
	env: EnvironmentVariables;
	definition: LucidConfigDefinition;
	paths?: {
		configPath?: string;
		projectRoot?: string;
	};
	target: RuntimePrepareArtifacts;
	customArtifactTypes?: string[];
}) => {
	for (const plugin of props.plugins) {
		if (!plugin.hooks?.runtime) {
			continue;
		}

		const res = await plugin.hooks.runtime({
			phase: "prepare",
			env: props.env,
			definition: props.definition,
			paths: props.paths,
		});
		if (res.error) {
			throw new Error(
				`Runtime prepare hook failed for the ${plugin.key} plugin.`,
			);
		}

		addSupportedArtifacts({
			target: props.target,
			artifacts: res.data?.artifacts ?? [],
			customArtifactTypes: props.customArtifactTypes,
		});
	}
};

/**
 * Collects setup artifacts from adapters and plugin prepare hooks.
 * Core keeps these opaque and filters by runtime-supported artifact type.
 */
export const collectRuntimePrepareArtifacts = async (props: {
	db: DatabaseAdapterValue;
	plugins: Array<LucidPluginResponse>;
	env: EnvironmentVariables;
	definition: LucidConfigDefinition;
	paths?: {
		configPath?: string;
		projectRoot?: string;
	};
	customArtifactTypes?: string[];
}): Promise<RuntimePrepareArtifacts> => {
	const result = createRuntimePrepareArtifacts();

	if (!props.customArtifactTypes?.length) {
		return result;
	}

	await collectDatabasePrepareArtifacts({
		db: props.db,
		env: props.env,
		target: result,
		customArtifactTypes: props.customArtifactTypes,
	});
	await collectPluginPrepareArtifacts({
		plugins: props.plugins,
		env: props.env,
		definition: props.definition,
		paths: props.paths,
		target: result,
		customArtifactTypes: props.customArtifactTypes,
	});

	return result;
};
