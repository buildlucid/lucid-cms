import { expect, test, vi } from "vitest";
import z from "zod";
import type { LucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { defineTable } from "../db/client/table/definition.js";
import defineContentApiRoute from "../http/define-content-api-route.js";
import defineJob from "../jobs/define-job.js";
import { getJobDefinitionRuntime, getJobRegistry } from "../jobs/registry.js";
import { ExternalScopes } from "../permission/external-scopes.js";
import defineToolkit from "../toolkit/define-toolkit.js";
import coreJobDefinitions from "./core-job-definitions.js";
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

test("rejects toolkit services that conflict with core services", async () => {
	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				plugins: [
					{
						key: "documents-plugin",
						lucid: "*",
						toolkit: defineToolkit({
							key: "documents",
							create: () => ({}),
						}),
						recipe: () => undefined,
					},
				],
			},
			{ resolvedDb: createAdapter("request") },
		),
	).rejects.toThrow(
		'Toolkit service key "documents" from plugin "documents-plugin" is reserved by Lucid.',
	);
});

test("rejects duplicate plugin toolkit service keys", async () => {
	const toolkit = defineToolkit({
		key: "search",
		create: () => ({}),
	});

	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				plugins: [
					{
						key: "first-search-plugin",
						lucid: "*",
						toolkit,
						recipe: () => undefined,
					},
					{
						key: "second-search-plugin",
						lucid: "*",
						toolkit,
						recipe: () => undefined,
					},
				],
			},
			{ resolvedDb: createAdapter("request") },
		),
	).rejects.toThrow(
		'Toolkit service key "search" is registered by more than one plugin.',
	);
});

test("rejects static content-route scopes that cannot be granted", async () => {
	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				http: {
					routes: [
						defineContentApiRoute({
							method: "get",
							path: "/missing-collection",
							access: {
								type: "scoped",
								scopes: [ExternalScopes.DocumentRead("missing")],
							},
							handler: ({ hono }) => hono.text("unreachable"),
						}),
					],
				},
			},
			{ resolvedDb: createAdapter("request") },
		),
	).rejects.toThrow(
		'Content route "GET /missing-collection" uses unavailable scopes: documents:missing:read.',
	);
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
			jobs: { definitions: [job] },
			plugins: [
				{
					key: "job-plugin",
					lucid: "*",
					recipe: (draft) => {
						draft.jobs.definitions.push(pluginJob);
					},
				},
			],
		},
		{
			resolvedDb: createAdapter("request"),
			skipValidation: true,
		},
	);

	const storedConfigJob = processed.jobs.definitions.find(
		(definition) => definition.name === job.name,
	);
	const storedPluginJob = processed.jobs.definitions.find(
		(definition) => definition.name === pluginJob.name,
	);
	expect(
		[...getJobRegistry(processed).values()].map(
			(definition) => definition.name,
		),
	).toEqual(
		[...coreJobDefinitions, job, pluginJob].map(
			(definition) => definition.name,
		),
	);
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

test("rejects duplicate job definitions after plugin config is merged", async () => {
	const job = defineJob({
		name: "test:duplicate-job",
		version: 1,
		input: z.object({}),
		handler: async () => ({ error: undefined, data: undefined }),
	});

	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				jobs: { definitions: [job, job] },
			},
			{ resolvedDb: createAdapter("request") },
		),
	).rejects.toThrow(
		'Job definition "test:duplicate-job@1" is registered more than once.',
	);
});

test("rejects schedule input that does not match its job schema", async () => {
	const job = defineJob({
		name: "test:invalid-schedule-input",
		version: 1,
		input: z.object({ count: z.number() }),
		schedules: [
			{
				name: "nightly",
				cron: "0 0 * * *",
				input: { count: "invalid" } as unknown as { count: number },
			},
		],
		handler: async () => ({ error: undefined, data: undefined }),
	});

	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				jobs: { definitions: [job] },
			},
			{
				resolvedDb: createAdapter("request"),
			},
		),
	).rejects.toThrow(
		'Schedule "test:invalid-schedule-input/nightly" has invalid job input.',
	);
});

test("rejects schedules that do not use minute precision", async () => {
	const job = defineJob({
		name: "test:invalid-schedule",
		version: 1,
		input: z.object({}),
		schedules: [{ name: "seconds", cron: "* * * * * *", input: {} }],
		handler: async () => ({ error: undefined, data: undefined }),
	});

	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				jobs: { definitions: [job] },
			},
			{ resolvedDb: createAdapter("request") },
		),
	).rejects.toThrow("five-field cron expression with minute precision");
});

test("rejects schedules with an invalid timezone", async () => {
	const job = defineJob({
		name: "test:invalid-timezone",
		version: 1,
		input: z.object({}),
		schedules: [
			{
				name: "nightly",
				cron: "0 0 * * *",
				timezone: "Not/AZone",
				input: {},
			},
		],
		handler: async () => ({ error: undefined, data: undefined }),
	});

	await expect(
		processConfig(
			{
				...config,
				secrets: "a".repeat(64),
				jobs: { definitions: [job] },
			},
			{ resolvedDb: createAdapter("request") },
		),
	).rejects.toThrow("invalid cron expression or timezone");
});
