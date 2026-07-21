import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { RuntimePrepareArtifacts } from "@lucidcms/core/types";
import constants, { DEFAULT_COMPATIBILITY_DATE } from "../constants.js";
import type {
	AdapterOptions,
	CloudflareBindingsOptions,
	CloudflareWranglerConfigArtifact,
} from "../types.js";
import {
	mergeCloudflareBindings,
	normalizeCloudflareBindings,
} from "../utils/bindings.js";
import writeFileIfChanged from "../utils/write-file.js";

type WranglerConfig = Record<string, unknown>;
type WranglerConfigTarget = "build" | "prepare";
type WriteWranglerConfigResult = {
	configPath?: string;
	generatedConfigPath?: string;
	deployConfigPath?: string;
	generated: boolean;
};
const require = createRequire(import.meta.url);

const toPosix = (value: string) => value.split(path.sep).join("/");

const ensureRelativeSpecifier = (value: string) => {
	const normalised = toPosix(value);
	if (normalised.startsWith(".")) return normalised;
	return `./${normalised}`;
};

const isObject = (value: unknown): value is WranglerConfig =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getStringArray = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

const mergeObject = (
	base: WranglerConfig,
	extension: WranglerConfig,
): WranglerConfig => {
	const result: WranglerConfig = { ...base };

	for (const [key, value] of Object.entries(extension)) {
		const current = result[key];
		if (isObject(current) && isObject(value)) {
			result[key] = mergeObject(current, value);
		} else {
			result[key] = value;
		}
	}

	return result;
};

const readJsonFile = async (
	filepath: string,
): Promise<WranglerConfig | null> => {
	try {
		const raw = await readFile(filepath, "utf-8");
		const parsed = JSON.parse(raw);
		return isObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

/**
 * Resolves user-owned Wrangler config paths from the project root, matching
 * the convention Lucid uses for generated root-level config.
 */
const resolveManualWranglerConfigPath = (props: {
	projectRoot: string;
	configPath: string;
}) =>
	path.isAbsolute(props.configPath)
		? props.configPath
		: path.resolve(props.projectRoot, props.configPath);

const getGeneratedConfigPath = (props: {
	outputPath: string;
	target: WranglerConfigTarget;
}) =>
	path.resolve(
		props.outputPath,
		props.target === "prepare"
			? constants.WRANGLER_DEV_CONFIG_FILE
			: constants.WRANGLER_BUILD_CONFIG_FILE,
	);

const readFileIfExists = async (filepath: string) => {
	try {
		return await readFile(filepath, "utf-8");
	} catch {
		return undefined;
	}
};

const hasGeneratedConfigMarker = (content: string) =>
	content.includes(constants.WRANGLER_GENERATED_CONFIG_MARKER);

/**
 * Root generated config is user-visible, so Lucid refuses to overwrite files
 * it cannot positively identify as its own generated output.
 */
const assertCanWriteGeneratedConfig = async (filepath: string) => {
	const content = await readFileIfExists(filepath);
	if (!content || hasGeneratedConfigMarker(content)) return;

	throw new Error(
		`Lucid cannot write ${path.basename(filepath)} because it already exists and does not include Lucid's generated-file marker. Move or remove the file, or configure the Cloudflare runtime to use it as a manual Wrangler config.`,
	);
};

/**
 * Manual Wrangler mode should clean up old Lucid-generated root config without
 * deleting a file the user may now own.
 */
const removeGeneratedConfigIfOwned = async (filepath: string) => {
	const content = await readFileIfExists(filepath);
	if (!content || !hasGeneratedConfigMarker(content)) return;

	await rm(filepath, { force: true });
};

const getGeneratedConfigContent = (config: WranglerConfig) =>
	[
		`// ${constants.WRANGLER_GENERATED_CONFIG_MARKER}`,
		"// This file is overwritten when Lucid prepares the Cloudflare runtime.",
		`${JSON.stringify(config, null, "\t")}\n`,
	].join("\n");

const removeDeployConfigIfGenerated = async (props: {
	projectRoot: string;
	generatedConfigPath: string;
}) => {
	const deployConfigPath = path.resolve(
		props.projectRoot,
		constants.WRANGLER_DEPLOY_CONFIG_FILE,
	);
	const deployConfig = await readJsonFile(deployConfigPath);
	const configPath =
		typeof deployConfig?.configPath === "string"
			? deployConfig.configPath
			: undefined;
	if (!configPath) return;

	const resolvedConfigPath = path.resolve(
		path.dirname(deployConfigPath),
		configPath,
	);
	if (resolvedConfigPath !== props.generatedConfigPath) return;

	await rm(deployConfigPath, { force: true });
};

const getPackageName = async (
	projectRoot: string,
): Promise<string | undefined> => {
	const packageJson = await readJsonFile(
		path.resolve(projectRoot, "package.json"),
	);
	const name = packageJson?.name;
	return typeof name === "string" ? name : undefined;
};

const slug = (value: string) => {
	const normalized = value
		.toLowerCase()
		.replace(/^@/, "")
		.replace(/[^\da-z]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "lucid-cms";
};

const unique = (values: string[]) => Array.from(new Set(values));

const resolveName = async (props: {
	options?: AdapterOptions["worker"];
	projectRoot: string;
}) => {
	if (props.options?.name) return slug(props.options.name);
	const packageName = await getPackageName(props.projectRoot);
	if (packageName) return slug(packageName);
	return slug(path.basename(props.projectRoot));
};

const resolveWranglerSchemaPath = (projectRoot: string) => {
	let current = projectRoot;
	while (true) {
		const candidate = path.resolve(
			current,
			"node_modules/wrangler/config-schema.json",
		);
		if (existsSync(candidate)) return candidate;

		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}

	return path.resolve(
		path.dirname(require.resolve("wrangler")),
		"..",
		"config-schema.json",
	);
};

const resolveSchemaPath = (props: {
	projectRoot: string;
	outputPath: string;
}) =>
	ensureRelativeSpecifier(
		path.relative(
			props.outputPath,
			resolveWranglerSchemaPath(props.projectRoot),
		),
	);

const resolveCompatibilityDate = (options?: AdapterOptions["worker"]) => {
	if (options?.compatibilityDate) return options.compatibilityDate;
	return DEFAULT_COMPATIBILITY_DATE;
};

const defaultResourceName = (workerName: string, binding: string) =>
	slug(`${workerName}-${binding}`);

const upsertObject = <T extends WranglerConfig>(
	items: T[],
	entry: T,
	key: keyof T,
): T[] => {
	const index = items.findIndex((item) => item[key] === entry[key]);
	if (index === -1) return [...items, entry];

	const next = [...items];
	const existing = next[index];
	if (existing) {
		next[index] = mergeObject(entry, existing) as T;
	}
	return next;
};

const getObjectArray = <T extends WranglerConfig>(value: unknown): T[] =>
	Array.isArray(value) ? (value.filter(isObject) as T[]) : [];

const isWranglerConfigArtifact = (
	artifact: RuntimePrepareArtifacts["custom"][number],
): artifact is RuntimePrepareArtifacts["custom"][number] & {
	custom: CloudflareWranglerConfigArtifact;
} =>
	artifact.type === constants.WRANGLER_CONFIG_ARTIFACT_TYPE &&
	isObject(artifact.custom);

const getArtifactBindings = (
	prepareArtifacts: RuntimePrepareArtifacts | undefined,
): CloudflareBindingsOptions | undefined => {
	if (!prepareArtifacts) {
		return undefined;
	}

	return mergeCloudflareBindings(
		...prepareArtifacts.custom
			.filter(isWranglerConfigArtifact)
			.map((artifact) => artifact.custom.bindings),
	);
};

/**
 * Adds or updates the KV namespace entry for the runtime-declared binding.
 */
const applyKVNamespace = (
	config: WranglerConfig,
	binding: NonNullable<ReturnType<typeof normalizeCloudflareBindings>["kv"]>,
) => {
	const namespaces = getObjectArray(config.kv_namespaces);
	config.kv_namespaces = upsertObject(
		namespaces,
		{
			binding: binding.binding,
			...(binding.id ? { id: binding.id } : {}),
			...(binding.previewId ? { preview_id: binding.previewId } : {}),
		},
		"binding",
	);
};

/**
 * Adds or updates the R2 bucket entry for the runtime-declared binding.
 */
const applyR2Bucket = (
	config: WranglerConfig,
	binding: NonNullable<ReturnType<typeof normalizeCloudflareBindings>["r2"]>,
	workerName: string,
) => {
	const buckets = getObjectArray(config.r2_buckets);
	config.r2_buckets = upsertObject(
		buckets,
		{
			binding: binding.binding,
			bucket_name:
				binding.bucketName ?? defaultResourceName(workerName, binding.binding),
			...(binding.previewBucketName
				? { preview_bucket_name: binding.previewBucketName }
				: {}),
		},
		"binding",
	);
};

/**
 * Adds or updates queue producer and consumer entries for the runtime binding.
 */
const applyQueue = (
	config: WranglerConfig,
	binding: NonNullable<
		ReturnType<typeof normalizeCloudflareBindings>["queues"]
	>,
	workerName: string,
) => {
	const queueName =
		binding.queueName ?? defaultResourceName(workerName, binding.binding);
	const queues = isObject(config.queues) ? { ...config.queues } : {};
	const producers = getObjectArray(queues.producers);
	const consumers = getObjectArray(queues.consumers);

	queues.producers = upsertObject(
		producers,
		{
			binding: binding.binding,
			queue: queueName,
		},
		"binding",
	);
	queues.consumers = upsertObject(
		consumers,
		{
			queue: queueName,
			...(binding.consumer?.maxBatchSize
				? { max_batch_size: binding.consumer.maxBatchSize }
				: {}),
			...(binding.consumer?.maxRetries
				? { max_retries: binding.consumer.maxRetries }
				: {}),
			...(binding.consumer?.maxConcurrency
				? { max_concurrency: binding.consumer.maxConcurrency }
				: {}),
		},
		"queue",
	);
	config.queues = queues;
};

/**
 * Adds or updates the D1 database entry for the runtime binding.
 */
const applyD1Database = (
	config: WranglerConfig,
	binding: NonNullable<ReturnType<typeof normalizeCloudflareBindings>["d1"]>,
	workerName: string,
) => {
	const databases = getObjectArray(config.d1_databases);
	config.d1_databases = upsertObject(
		databases,
		{
			binding: binding.binding,
			database_name:
				binding.databaseName ??
				defaultResourceName(workerName, binding.binding),
			...(binding.databaseId ? { database_id: binding.databaseId } : {}),
			...(binding.previewDatabaseId
				? { preview_database_id: binding.previewDatabaseId }
				: {}),
			...(binding.remote !== undefined ? { remote: binding.remote } : {}),
		},
		"binding",
	);
};

/**
 * Applies all binding types currently modelled by the Cloudflare runtime.
 */
const applyRuntimeBindings = (props: {
	config: WranglerConfig;
	options?: AdapterOptions;
	prepareArtifacts?: RuntimePrepareArtifacts;
	workerName: string;
}) => {
	const bindings = normalizeCloudflareBindings(
		mergeCloudflareBindings(
			getArtifactBindings(props.prepareArtifacts),
			props.options?.bindings,
		),
	);
	if (bindings.kv) {
		applyKVNamespace(props.config, bindings.kv);
	}
	if (bindings.r2) {
		applyR2Bucket(props.config, bindings.r2, props.workerName);
	}
	if (bindings.queues) {
		applyQueue(props.config, bindings.queues, props.workerName);
	}
	if (bindings.d1) {
		applyD1Database(props.config, bindings.d1, props.workerName);
	}
};

/**
 * Builds the final generated config while letting Lucid own Worker entry,
 * assets, cron, compatibility, and binding requirements.
 */
const resolveConfig = async (props: {
	projectRoot: string;
	outputPath: string;
	workerOptions?: AdapterOptions["worker"];
	adapterOptions?: AdapterOptions;
	prepareArtifacts?: RuntimePrepareArtifacts;
	target: WranglerConfigTarget;
}) => {
	const config: WranglerConfig = {};
	const workerName = await resolveName({
		options: props.workerOptions,
		projectRoot: props.projectRoot,
	});

	config.$schema =
		typeof config.$schema === "string"
			? config.$schema
			: resolveSchemaPath({
					projectRoot: props.projectRoot,
					outputPath: props.outputPath,
				});
	config.name = workerName;
	config.compatibility_date = resolveCompatibilityDate(props.workerOptions);
	config.compatibility_flags = unique([
		...getStringArray(config.compatibility_flags),
		...(props.workerOptions?.compatibilityFlags ?? []),
		"nodejs_compat",
	]);
	if (props.target === "build") {
		config.main = `${constants.ENTRY_FILE}.js`;
		config.assets = {
			...(isObject(config.assets) ? config.assets : {}),
			directory: "./public",
			binding: constants.ASSETS_BINDING,
		};

		const triggers = isObject(config.triggers) ? { ...config.triggers } : {};
		triggers.crons = unique([
			...getStringArray(triggers.crons),
			...(props.workerOptions?.crons ?? constants.DEFAULT_CRONS),
		]);
		config.triggers = triggers;
	} else {
		delete config.main;
		delete config.assets;
		delete config.triggers;
	}

	applyRuntimeBindings({
		config,
		options: props.adapterOptions,
		prepareArtifacts: props.prepareArtifacts,
		workerName,
	});

	delete config.build;
	delete config.env;

	return config;
};

/**
 * Writes the generated Wrangler config and, for builds, Cloudflare's deploy
 * redirect so `wrangler deploy` picks up the output config automatically.
 */
const writeWranglerConfig = async (props: {
	configPath: string;
	outputPath: string;
	options?: AdapterOptions;
	prepareArtifacts?: RuntimePrepareArtifacts;
	target: WranglerConfigTarget;
}): Promise<WriteWranglerConfigResult> => {
	const projectRoot = path.dirname(path.resolve(props.configPath));
	const outputPath = path.resolve(props.outputPath);
	const generatedConfigPath = getGeneratedConfigPath({
		outputPath,
		target: props.target,
	});
	const manualConfigPath = props.options?.wrangler
		? resolveManualWranglerConfigPath({
				projectRoot,
				configPath: props.options.wrangler,
			})
		: undefined;

	if (manualConfigPath) {
		const generatedDevConfigPath = getGeneratedConfigPath({
			outputPath: projectRoot,
			target: "prepare",
		});
		if (manualConfigPath !== generatedDevConfigPath) {
			await removeGeneratedConfigIfOwned(generatedDevConfigPath);
		}
		if (props.target === "build") {
			await removeDeployConfigIfGenerated({
				projectRoot,
				generatedConfigPath,
			});
		}

		return {
			configPath: manualConfigPath,
			generated: false,
		};
	}

	if (props.target === "prepare") {
		await assertCanWriteGeneratedConfig(generatedConfigPath);
	}

	const config = await resolveConfig({
		projectRoot,
		outputPath,
		workerOptions: props.options?.worker,
		adapterOptions: props.options,
		prepareArtifacts: props.prepareArtifacts,
		target: props.target,
	});
	await mkdir(outputPath, { recursive: true });
	await writeFileIfChanged(
		generatedConfigPath,
		getGeneratedConfigContent(config),
	);

	if (props.target !== "build") {
		return {
			configPath: generatedConfigPath,
			generatedConfigPath,
			generated: true,
		};
	}

	const deployConfigPath = path.resolve(
		projectRoot,
		constants.WRANGLER_DEPLOY_CONFIG_FILE,
	);
	const deployConfigDirectory = path.dirname(deployConfigPath);
	const deployConfig = {
		configPath: toPosix(
			path.relative(deployConfigDirectory, generatedConfigPath),
		),
	};

	await mkdir(deployConfigDirectory, { recursive: true });
	await writeFileIfChanged(
		deployConfigPath,
		`${JSON.stringify(deployConfig, null, "\t")}\n`,
	);

	return {
		configPath: generatedConfigPath,
		generatedConfigPath,
		deployConfigPath,
		generated: true,
	};
};

export default writeWranglerConfig;
