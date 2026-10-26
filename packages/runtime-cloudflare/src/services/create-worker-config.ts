import type { WorkerConfig } from "@cloudflare/config";
import type { PluginConfig } from "@cloudflare/vite-plugin";
import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import constants, {
	AGENT_RUNS_BINDING,
	AGENT_RUNS_EXPORT,
} from "../constants.js";
import type { AdapterOptions } from "../types.js";
import {
	mergeCloudflareBindings,
	normalizeCloudflareBindings,
} from "../utils/bindings.js";
import defaultResourceName from "../utils/default-resource-name.js";
import getArtifactBindings from "../utils/get-artifact-bindings.js";

/** The entry Worker settings the Cloudflare Vite plugin merges over `cloudflare.config.ts`, or its defaults without one. */
export type EntryWorkerConfig = Exclude<
	NonNullable<PluginConfig["config"]>,
	(...args: never[]) => unknown
>;
type WorkerEnv = NonNullable<EntryWorkerConfig["env"]>;
/** The Durable Object exports Lucid declares, which suit both the Vite plugin's config and `cloudflare.config.ts`. */
type LucidExports = Record<
	string,
	{ type: "durable-object"; storage: "sqlite" }
>;
type WorkerTriggers = NonNullable<EntryWorkerConfig["triggers"]>;
type LucidTrigger = Extract<
	WorkerTriggers[number],
	{ type: "scheduled" | "queue" }
>;

/** Adds Lucid's Worker entry, Node.js compatibility, admin assets, scheduler, queue consumers, agent run Durable Object, bindings and secrets (`.dev.vars` or `.env` locally), preserving declared bindings, exports, flags, triggers and queue names while `--remote` connects declared Lucid resources. */
const createWorkerConfig = (props: {
	name: string;
	compatibilityDate: string;
	entrypoint: string;
	options?: AdapterOptions;
	artifacts: RuntimeArtifactCustom[];
	/** Env variable names to declare as secrets, which Cloudflare requires at deploy. */
	secrets: string[];
	/** The Worker's own settings, from `cloudflare.config.ts` or the Cloudflare plugin's defaults. */
	worker?: Pick<WorkerConfig, "env" | "compatibilityFlags" | "triggers"> & {
		exports?: Record<string, unknown>;
	};
	/** Connects Lucid's bindings to their deployed resources during development, for `--remote`. */
	remote?: boolean;
}): Omit<EntryWorkerConfig, "exports"> & { exports: LucidExports } => {
	const dev = props.remote ? { dev: { remote: true } } : {};
	const bindings = normalizeCloudflareBindings(
		mergeCloudflareBindings(
			getArtifactBindings(props.artifacts),
			props.options?.bindings,
		),
	);

	const workerEnv = props.worker?.env ?? {};
	const env: WorkerEnv = {};
	const triggers: WorkerTriggers = [];

	/** Adds a trigger unless the Worker declares the same schedule or queue consumer itself. */
	const addTrigger = (trigger: LucidTrigger) => {
		const declared = props.worker?.triggers?.some((existing) =>
			existing.type === "scheduled" && trigger.type === "scheduled"
				? existing.schedule === trigger.schedule
				: existing.type === "queue" &&
					trigger.type === "queue" &&
					existing.name === trigger.name,
		);
		if (!declared) triggers.push(trigger);
	};

	/** Adds a binding unless the Worker declares it, when `--remote` still connects its declaration of a Lucid resource. */
	const addBinding = (name: string, binding: WorkerEnv[string]) => {
		const declared = workerEnv[name];
		if (!(name in workerEnv)) {
			env[name] = binding;
		} else if (
			props.remote &&
			declared &&
			(declared.type === "kv" ||
				declared.type === "r2" ||
				declared.type === "queue" ||
				declared.type === "images")
		) {
			env[name] = { ...declared, dev: { ...declared.dev, remote: true } };
		}
	};

	addTrigger({ type: "scheduled", schedule: constants.JOB_SCHEDULER_CRON });
	for (const name of props.secrets) addBinding(name, { type: "secret" });
	addBinding(constants.ASSETS_BINDING, { type: "assets" });

	//* Always declare the agent run Durable Object so removing agents never requires a deleted export.
	const exports: LucidExports = {};
	addBinding(AGENT_RUNS_BINDING, {
		type: "durable-object",
		worker: props.name,
		exportName: AGENT_RUNS_EXPORT,
	});
	if (!props.worker?.exports?.[AGENT_RUNS_EXPORT]) {
		exports[AGENT_RUNS_EXPORT] = { type: "durable-object", storage: "sqlite" };
	}

	if (bindings.kv) {
		addBinding(bindings.kv.binding, {
			type: "kv",
			...(bindings.kv.id && { id: bindings.kv.id }),
			...dev,
		});
	}

	if (bindings.r2) {
		addBinding(bindings.r2.binding, {
			type: "r2",
			name:
				bindings.r2.bucketName ??
				defaultResourceName(props.name, bindings.r2.binding),
			...dev,
		});
	}

	if (bindings.queues) {
		const declared = workerEnv[bindings.queues.binding];
		const name =
			(declared && declared.type === "queue" ? declared.name : undefined) ??
			bindings.queues.queueName ??
			defaultResourceName(props.name, bindings.queues.binding);
		const consumer = bindings.queues.consumer;

		addBinding(bindings.queues.binding, { type: "queue", name, ...dev });
		addTrigger({
			type: "queue",
			name,
			...(consumer?.maxBatchSize !== undefined && {
				maxBatchSize: consumer.maxBatchSize,
			}),
			...(consumer?.maxRetries !== undefined && {
				maxRetries: consumer.maxRetries,
			}),
			...(consumer?.maxConcurrency !== undefined && {
				maxConcurrency: consumer.maxConcurrency,
			}),
		});
	}

	if (bindings.images) {
		addBinding(bindings.images.binding, { type: "images", ...dev });
	}

	return {
		name: props.name,
		compatibilityDate: props.compatibilityDate,
		compatibilityFlags: Array.from(
			new Set([
				...(props.options?.worker?.compatibilityFlags ?? []),
				"nodejs_compat",
			]),
		).filter((flag) => !props.worker?.compatibilityFlags?.includes(flag)),
		entrypoint: props.entrypoint,
		env,
		exports,
		triggers,
	};
};

export default createWorkerConfig;
