import packageJson from "../../../package.json" with { type: "json" };
import type { Config } from "../../types/config.js";
import { firstPartyRuntimeAdapterKeys } from "../runtime/constants.js";
import type {
	AdapterKeys,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import { getTelemetryEnvValue, isTelemetryEnvFlagEnabled } from "./config.js";
import type { TelemetryCountBucket, TelemetryEnvelope } from "./types.js";

export const getTelemetryCountBucket = (
	count: number,
): TelemetryCountBucket => {
	if (count <= 0) return "0";
	if (count === 1) return "1";
	if (count <= 5) return "2-5";
	if (count <= 10) return "6-10";
	if (count <= 25) return "11-25";
	if (count <= 50) return "26-50";
	if (count <= 100) return "51-100";
	return "101+";
};

const normalizeFirstPartyKey = <Key extends string>(
	value: string,
	knownKeys: readonly Key[],
): Key | "custom" =>
	knownKeys.includes(value as Key) ? (value as Key) : "custom";

const getPackageManager = (
	env?: EnvironmentVariables,
): TelemetryEnvelope["context"]["package_manager"] => {
	const userAgent = getTelemetryEnvValue(env, "npm_config_user_agent");
	if (typeof userAgent !== "string") return "other";
	for (const manager of ["pnpm", "yarn", "bun", "npm"] as const) {
		if (userAgent.startsWith(`${manager}/`)) return manager;
	}
	return "other";
};

const getEnvironment = (
	env?: EnvironmentVariables,
): TelemetryEnvelope["context"]["environment"] => {
	const value = getTelemetryEnvValue(env, "NODE_ENV");
	return value === "development" || value === "production" || value === "test"
		? value
		: "other";
};

const getIsCI = (env?: EnvironmentVariables) =>
	["CI", "CONTINUOUS_INTEGRATION", "GITHUB_ACTIONS", "BUILDKITE"].some((key) =>
		isTelemetryEnvFlagEnabled(getTelemetryEnvValue(env, key)),
	);

const getContentCounts = (config: Config) => {
	let fields = 0;
	const collections = new Set<string>();
	const bricks = new Set<string>();

	for (const collection of config.collections) {
		if (collection.key) collections.add(collection.key);
		fields += collection.flatFields.length;

		for (const brick of collection.brickInstances) {
			if (bricks.has(brick.key)) continue;
			bricks.add(brick.key);
			fields += brick.flatFields.length;
		}
	}

	return {
		collections: collections.size,
		bricks: bricks.size,
		fields,
	};
};

const getAdapters = (
	config: Config,
	adapterKeys?: AdapterKeys,
): TelemetryEnvelope["context"]["adapters"] => ({
	database: normalizeFirstPartyKey(
		adapterKeys?.database ?? config.db.adapter,
		firstPartyRuntimeAdapterKeys.database,
	),
	...(adapterKeys
		? {
				media:
					adapterKeys.media === null
						? ("none" as const)
						: normalizeFirstPartyKey(
								adapterKeys.media,
								firstPartyRuntimeAdapterKeys.media,
							),
				queue: normalizeFirstPartyKey(
					adapterKeys.queue,
					firstPartyRuntimeAdapterKeys.queue,
				),
				kv: normalizeFirstPartyKey(
					adapterKeys.kv,
					firstPartyRuntimeAdapterKeys.kv,
				),
				email: normalizeFirstPartyKey(
					adapterKeys.email,
					firstPartyRuntimeAdapterKeys.email,
				),
			}
		: {}),
});

/** Builds the complete, allowlisted setup context sent with lifecycle events. */
export const getTelemetryContext = (props: {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext: AdapterRuntimeContext;
	adapterKeys?: AdapterKeys;
}): TelemetryEnvelope["context"] => {
	const counts = getContentCounts(props.config);
	const nodeMajor = Number.parseInt(
		process.versions.node.split(".")[0] ?? "0",
		10,
	);

	return {
		lucid_version: packageJson.version,
		runtime: normalizeFirstPartyKey(
			props.runtimeContext.runtime,
			firstPartyRuntimeAdapterKeys.runtime,
		),
		compiled: props.runtimeContext.compiled,
		node_major: Number.isFinite(nodeMajor) ? nodeMajor : 0,
		platform:
			process.platform === "darwin" ||
			process.platform === "linux" ||
			process.platform === "win32"
				? process.platform
				: "other",
		architecture:
			process.arch === "arm64" || process.arch === "x64"
				? process.arch
				: "other",
		package_manager: getPackageManager(props.env),
		environment: getEnvironment(props.env),
		is_ci: getIsCI(props.env),
		adapters: getAdapters(props.config, props.adapterKeys),
		features: {
			localization: props.config.localization.locales.length > 1,
			ai: props.config.ai.enabled,
			open_api: props.config.http.openAPI.enabled,
			password_auth: props.config.auth.password.enabled,
		},
		counts: {
			collections: getTelemetryCountBucket(counts.collections),
			bricks: getTelemetryCountBucket(counts.bricks),
			fields: getTelemetryCountBucket(counts.fields),
			plugins: getTelemetryCountBucket(props.config.plugins.length),
			locales: getTelemetryCountBucket(
				props.config.localization.locales.length,
			),
			auth_providers: getTelemetryCountBucket(
				props.config.auth.providers.length,
			),
		},
	};
};
