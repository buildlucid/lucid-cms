import { expect, test } from "vitest";
import constants, { DEFAULT_COMPATIBILITY_DATE } from "../constants.js";
import createWorkerConfig from "./create-worker-config.js";

test("declares the entry, secrets, bindings, exports and triggers Lucid needs", () => {
	const config = createWorkerConfig({
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		entrypoint: "virtual:lucid/cloudflare-worker",
		options: { bindings: { kv: { id: "kv-id" } } },
		artifacts: [
			{
				type: constants.BINDINGS_ARTIFACT_TYPE,
				custom: {
					bindings: {
						queues: { queueName: "jobs", consumer: { maxBatchSize: 10 } },
					},
				},
			},
			{ type: "other", custom: { bindings: { r2: true } } },
		],
		secrets: ["COOKIE_SECRET", "LUCID_KV"],
	});

	expect(config).toEqual({
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		compatibilityFlags: ["nodejs_compat"],
		entrypoint: "virtual:lucid/cloudflare-worker",
		env: {
			COOKIE_SECRET: { type: "secret" },
			// Lucid's own binding wins over a secret of the same name.
			LUCID_KV: { type: "kv", id: "kv-id" },
			ASSETS: { type: "assets" },
			LUCID_AGENT_RUNS: {
				type: "durable-object",
				worker: "my-site",
				exportName: "LucidAgentRuns",
			},
			LUCID_QUEUE: { type: "queue", name: "jobs" },
		},
		exports: {
			LucidAgentRuns: { type: "durable-object", storage: "sqlite" },
		},
		triggers: [
			{ type: "scheduled", schedule: constants.JOB_SCHEDULER_CRON },
			{ type: "queue", name: "jobs", maxBatchSize: 10 },
		],
	});
});

test("leaves out the Worker's own bindings and flags, and binds its queue to the consumer", () => {
	const config = createWorkerConfig({
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		entrypoint: "virtual:lucid/cloudflare-worker",
		options: {
			bindings: { r2: true, queues: { consumer: { maxRetries: 0 } } },
		},
		artifacts: [],
		secrets: ["COOKIE_SECRET"],
		worker: {
			compatibilityFlags: ["nodejs_compat"],
			env: {
				COOKIE_SECRET: { type: "secret" },
				LUCID_MEDIA_BUCKET: { type: "r2", name: "my-bucket" },
				LUCID_QUEUE: { type: "queue", name: "my-jobs" },
			},
		},
	});

	expect(config.compatibilityFlags).toEqual([]);
	expect(Object.keys(config.env ?? {})).toEqual(["ASSETS", "LUCID_AGENT_RUNS"]);
	expect(config.triggers).toContainEqual({
		type: "queue",
		name: "my-jobs",
		maxRetries: 0,
	});
});

test("connects the Worker's own declarations of Lucid's bindings for --remote", () => {
	const config = createWorkerConfig({
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		entrypoint: "virtual:lucid/cloudflare-worker",
		options: { bindings: { kv: true, r2: true } },
		artifacts: [],
		secrets: [],
		remote: true,
		worker: {
			env: {
				LUCID_KV: { type: "kv", id: "my-kv" },
				LUCID_MEDIA_BUCKET: { type: "r2", name: "my-bucket" },
				OTHER_KV: { type: "kv", id: "other" },
			},
		},
	});

	expect(config.env).toEqual({
		ASSETS: { type: "assets" },
		LUCID_AGENT_RUNS: expect.objectContaining({ type: "durable-object" }),
		LUCID_KV: { type: "kv", id: "my-kv", dev: { remote: true } },
		LUCID_MEDIA_BUCKET: {
			type: "r2",
			name: "my-bucket",
			dev: { remote: true },
		},
	});
});

test("leaves out triggers the Worker declares itself", () => {
	const config = createWorkerConfig({
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		entrypoint: "virtual:lucid/cloudflare-worker",
		options: { bindings: { queues: { queueName: "my-jobs" } } },
		artifacts: [],
		secrets: [],
		worker: {
			triggers: [
				{ type: "scheduled", schedule: constants.JOB_SCHEDULER_CRON },
				{ type: "queue", name: "my-jobs", maxBatchSize: 1 },
			],
		},
	});

	expect(config.triggers).toEqual([]);
});

test("leaves out the agent run Durable Object when the Worker declares it", () => {
	const config = createWorkerConfig({
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		entrypoint: "virtual:lucid/cloudflare-worker",
		artifacts: [],
		secrets: [],
		worker: {
			env: {
				LUCID_AGENT_RUNS: {
					type: "durable-object",
					worker: "my-site",
					exportName: "LucidAgentRuns",
				},
			},
			exports: {
				LucidAgentRuns: { type: "durable-object", storage: "sqlite" },
			},
		},
	});

	expect(config.env).toEqual({ ASSETS: { type: "assets" } });
	expect(config.exports).toEqual({});
});
