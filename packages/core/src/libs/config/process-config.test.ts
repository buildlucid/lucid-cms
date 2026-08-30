import { expect, test, vi } from "vitest";
import z from "zod";
import type { LucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { defineTable } from "../db/client/table/definition.js";
import defineJob from "../queue/define-job.js";
import coreJobs from "../queue/jobs/core-jobs.js";
import { getJobRegistry } from "../queue/registry.js";
import { getJobDefinitionRuntime } from "../queue/types.js";
import processConfig from "./process-config.js";

const createAdapter = (adapter: string) =>
	({
		adapter,
		connect: vi.fn(),
		inferSchema: vi.fn(),
		dropAllTables: vi.fn(),
	}) as unknown as DatabaseAdapter;

const config: LucidConfig = {
	collections: [],
	plugins: [],
};

test("processes each config independently", async () => {
	const requestAdapter = createAdapter("request");
	const runtimeAdapter = createAdapter("runtime");

	await processConfig(config, {
		resolvedDb: requestAdapter,
		skipValidation: true,
	});
	const cached = await processConfig(config, {
		resolvedDb: runtimeAdapter,
		skipValidation: true,
	});

	expect(cached.db).toBe(runtimeAdapter);
	expect(cached.tables).toEqual([]);
	expect(cached.telemetry).toBe(true);
});

test("applies plugin recipes during fresh config processing", async () => {
	const init = vi.fn(async () => ({
		data: undefined,
		error: undefined,
	}));
	const pluginTable = defineTable<{ value: string }>("plugin_config", {
		columns: {
			value: {
				schema: z.string(),
				type: "text",
			},
		},
	});
	const processed = await processConfig(
		{
			...config,
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					hooks: { init },
					recipe: (draft) => {
						draft.tables.push(pluginTable);
						draft.brand = {
							...draft.brand,
							name: "Configured by plugin",
						};
					},
				},
			],
		},
		{
			resolvedDb: createAdapter("request"),
			skipValidation: true,
		},
	);

	expect(init).toHaveBeenCalledOnce();
	expect(processed.tables).toEqual([pluginTable]);
	expect(processed.brand.name).toBe("Configured by plugin");
});

test("preserves job definitions while merging config", async () => {
	const job = defineJob({
		name: "test:config-job",
		version: 1,
		input: z.object({ value: z.string() }),
		handler: async () => ({ error: undefined, data: undefined }),
	});
	const pluginJob = defineJob({
		name: "test:plugin-job",
		version: 1,
		input: z.object({ value: z.string() }),
		handler: async () => ({ error: undefined, data: undefined }),
	});
	const processed = await processConfig(
		{
			...config,
			queue: { jobs: [job] },
			plugins: [
				{
					key: "job-plugin",
					lucid: "*",
					recipe: (draft) => {
						draft.queue.jobs.push(pluginJob);
					},
				},
			],
		},
		{
			resolvedDb: createAdapter("request"),
			skipValidation: true,
		},
	);

	const storedConfigJob = processed.queue.jobs.find(
		(definition) => definition.name === job.name,
	);
	const storedPluginJob = processed.queue.jobs.find(
		(definition) => definition.name === pluginJob.name,
	);
	expect(
		[...getJobRegistry(processed).values()].map(
			(definition) => definition.name,
		),
	).toEqual([...coreJobs, job, pluginJob].map((definition) => definition.name));
	expect(storedConfigJob).toMatchObject({
		type: "job-definition",
		name: "test:config-job",
		version: 1,
	});
	expect(
		storedConfigJob && getJobDefinitionRuntime(storedConfigJob),
	).toBeDefined();
	expect(
		storedPluginJob && getJobDefinitionRuntime(storedPluginJob),
	).toBeDefined();
});
