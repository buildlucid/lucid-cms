import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { parse as parseToml } from "smol-toml";
import constants from "../constants.js";
import type { AdapterOptions } from "../types.js";
import { normalizeCloudflareBindings } from "../utils/bindings.js";

type WranglerConfig = Record<string, unknown>;
type WranglerConfigTarget = "build" | "prepare";
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

const withoutEnv = (config: WranglerConfig): WranglerConfig => {
	const { env: _env, ...rest } = config;
	return rest;
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
 * Finds an existing user Wrangler config so Lucid can extend it instead of
 * forcing all config to live in `lucid.config`.
 */
const findSourceConfigPath = async (props: {
	projectRoot: string;
	configPath?: string;
}): Promise<string | undefined> => {
	if (props.configPath) {
		return path.isAbsolute(props.configPath)
			? props.configPath
			: path.resolve(props.projectRoot, props.configPath);
	}

	const candidates = ["wrangler.jsonc", "wrangler.json", "wrangler.toml"];
	for (const candidate of candidates) {
		const filepath = path.resolve(props.projectRoot, candidate);
		try {
			await readFile(filepath, "utf-8");
			return filepath;
		} catch {
			// Continue checking the remaining supported Wrangler config names.
		}
	}

	return undefined;
};

/**
 * Reads the source Wrangler config and merges the selected env block because
 * generated configs are written for one effective environment at a time.
 */
const readSourceConfig = async (props: {
	projectRoot: string;
	configPath?: string;
	environment?: string;
}): Promise<WranglerConfig> => {
	const sourcePath = await findSourceConfigPath({
		projectRoot: props.projectRoot,
		configPath: props.configPath,
	});
	if (!sourcePath) return {};

	const source = await readFile(sourcePath, "utf-8");
	const ext = path.extname(sourcePath);
	const parsed =
		ext === ".toml"
			? parseToml(source)
			: parseJsonc(source, undefined, {
					allowTrailingComma: true,
					disallowComments: false,
				});

	if (!isObject(parsed)) return {};

	const topLevel = withoutEnv(parsed);
	let envConfig: WranglerConfig | undefined;
	if (props.environment && isObject(parsed.env)) {
		const rawEnvConfig = parsed.env[props.environment];
		if (isObject(rawEnvConfig)) {
			envConfig = withoutEnv(rawEnvConfig);
		}
	}

	return envConfig ? mergeObject(topLevel, envConfig) : topLevel;
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
	config: WranglerConfig;
	options?: AdapterOptions["wrangler"];
	projectRoot: string;
}) => {
	if (props.options?.name) return slug(props.options.name);
	if (typeof props.config.name === "string") return slug(props.config.name);
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

const resolveCompatibilityDate = (
	config: WranglerConfig,
	options?: AdapterOptions["wrangler"],
) => {
	if (options?.compatibilityDate) return options.compatibilityDate;
	if (typeof config.compatibility_date === "string") {
		return config.compatibility_date;
	}
	return new Date().toISOString().slice(0, 10);
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
 * Applies all binding types currently modelled by the Cloudflare runtime.
 */
const applyRuntimeBindings = (props: {
	config: WranglerConfig;
	options?: AdapterOptions;
	workerName: string;
}) => {
	const bindings = normalizeCloudflareBindings(
		props.options?.wrangler?.bindings,
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
};

/**
 * Builds the final generated config while letting Lucid own Worker entry,
 * assets, cron, compatibility, and binding requirements.
 */
const resolveConfig = async (props: {
	sourceConfig: WranglerConfig;
	projectRoot: string;
	outputPath: string;
	options?: AdapterOptions["wrangler"];
	adapterOptions?: AdapterOptions;
	target: WranglerConfigTarget;
}) => {
	const config: WranglerConfig = { ...props.sourceConfig };
	const workerName = await resolveName({
		config,
		options: props.options,
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
	config.compatibility_date = resolveCompatibilityDate(config, props.options);
	config.compatibility_flags = unique([
		...getStringArray(config.compatibility_flags),
		...(props.options?.compatibilityFlags ?? []),
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
			...(props.options?.crons ?? constants.DEFAULT_CRONS),
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
	target: WranglerConfigTarget;
}): Promise<{ generatedConfigPath?: string; deployConfigPath?: string }> => {
	const wranglerOptions = props.options?.wrangler;
	if (wranglerOptions?.generate === false) {
		return {};
	}

	const projectRoot = path.dirname(path.resolve(props.configPath));
	const outputPath = path.resolve(props.outputPath);
	const sourceConfig = await readSourceConfig({
		projectRoot,
		configPath: wranglerOptions?.configPath,
		environment: props.options?.platformProxy?.environment,
	});
	const config = await resolveConfig({
		sourceConfig,
		projectRoot,
		outputPath,
		options: wranglerOptions,
		adapterOptions: props.options,
		target: props.target,
	});
	const generatedConfigPath = path.resolve(
		outputPath,
		constants.WRANGLER_CONFIG_FILE,
	);
	await mkdir(outputPath, { recursive: true });
	await writeFile(
		generatedConfigPath,
		`${JSON.stringify(config, null, "\t")}\n`,
	);

	if (props.target !== "build") {
		return {
			generatedConfigPath,
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
	await writeFile(
		deployConfigPath,
		`${JSON.stringify(deployConfig, null, "\t")}\n`,
	);

	return {
		generatedConfigPath,
		deployConfigPath,
	};
};

export default writeWranglerConfig;
