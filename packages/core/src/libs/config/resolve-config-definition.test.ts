import { expect, expectTypeOf, test, vi } from "vitest";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import {
	createDatabaseAdapterCreator,
	createDatabaseAdapterFactory,
} from "../db/adapter-factory.js";
import type { LucidPluginHookRuntime } from "../plugins/types.js";
import configureLucid from "../runtime/configure-lucid.js";
import resolveConfigDefinition from "./resolve-config-definition.js";

const createAdapter = (adapter = "test") =>
	({
		adapter,
		initialize: vi.fn(),
		inferSchema: vi.fn(),
		dropAllTables: vi.fn(),
	}) as unknown as DatabaseAdapter;

test("resolves no-call runtime and database adapter creators", async () => {
	const adapter = createAdapter("creator");
	const runtime = () => ({
		key: "node",
		lucid: "0.0.0",
	});
	const db = createDatabaseAdapterCreator(() => adapter, {
		adapter: "creator",
		resolve: vi.fn((env) => {
			expect(env).toEqual({
				DATABASE_URL: "file:test.db",
				SECRET: "a".repeat(64),
			});
			return adapter;
		}),
	});

	const result = await resolveConfigDefinition({
		definition: configureLucid({
			runtime,
			db,
			config: (env) => ({
				secrets: {
					encryption: env.SECRET as string,
					cookie: env.SECRET as string,
					refreshToken: env.SECRET as string,
					accessToken: env.SECRET as string,
				},
				collections: [],
				plugins: [],
			}),
		}),
		env: {
			DATABASE_URL: "file:test.db",
			SECRET: "a".repeat(64),
		},
		processConfigOptions: {
			bypassCache: true,
			skipValidation: true,
		},
	});

	expect(result.adapter.key).toBe("node");
	expect(result.config.db).toBe(adapter);
	expect(db.resolve).toHaveBeenCalledOnce();
});

test("resolves env schema from the config definition", async () => {
	const adapter = createAdapter("inline-env");
	const env = z.object({
		SECRET: z.string(),
	});
	const definition = configureLucid({
		runtime: {
			key: "node",
			lucid: "0.0.0",
		},
		db: adapter,
		env,
		config: (env) => {
			expectTypeOf(env.SECRET).toEqualTypeOf<string>();

			return {
				secrets: {
					encryption: env.SECRET,
					cookie: env.SECRET,
					refreshToken: env.SECRET,
					accessToken: env.SECRET,
				},
				collections: [],
				plugins: [],
			};
		},
	});

	const result = await resolveConfigDefinition({
		definition,
		env: {
			SECRET: "a".repeat(64),
		},
		processConfigOptions: {
			bypassCache: true,
			skipValidation: true,
		},
	});

	expect(result.envSchema).toBe(env);
	expect(result.config.db).toBe(adapter);
});

test("skips env schema validation and fills missing secrets during build resolution", async () => {
	const adapter = createAdapter("build-env");
	const env = z.object({
		SECRET: z.string().length(64),
	});
	const definition = configureLucid({
		runtime: {
			key: "node",
			lucid: "0.0.0",
		},
		db: adapter,
		env,
		config: (env) => ({
			secrets: env.SECRET,
			collections: [],
			plugins: [],
		}),
	});

	await expect(
		resolveConfigDefinition({
			definition,
			env: {},
			processConfigOptions: {
				bypassCache: true,
				mode: "build",
			},
		}),
	).rejects.toThrow();

	const result = await resolveConfigDefinition({
		definition,
		env: {},
		validateEnvSchema: false,
		processConfigOptions: {
			bypassCache: true,
			mode: "build",
		},
	});

	expect(result.envSchema).toBe(env);
	expect(Object.values(result.config.secrets)).toHaveLength(4);
	expect(
		Object.values(result.config.secrets).every(
			(secret) => secret.length === 64,
		),
	).toBe(true);
});

test("passes supported prepare artifacts from db factories and plugins to the runtime", async () => {
	const adapter = createAdapter("prepare");
	const db = createDatabaseAdapterFactory({
		adapter: "prepare",
		resolve: () => adapter,
		hooks: {
			runtime: [
				{
					type: "test:prepare",
					custom: {
						source: "db",
					},
				},
			],
		},
	});
	const prepare = vi.fn(async () => undefined);
	const getEnvVars = vi.fn(async () => ({
		SECRET: "a".repeat(64),
	}));
	const runtimeHook = vi.fn(
		async ({ phase }: Parameters<LucidPluginHookRuntime>[0]) => ({
			error: undefined,
			data: {
				artifacts:
					phase === "prepare"
						? [
								{
									type: "test:prepare",
									custom: {
										source: "plugin",
									},
								},
								{
									type: "ignored:prepare",
									custom: {
										source: "plugin",
									},
								},
							]
						: [],
			},
		}),
	);

	await resolveConfigDefinition({
		definition: configureLucid({
			runtime: {
				key: "test",
				lucid: "0.0.0",
				config: {
					customPrepareArtifacts: ["test:prepare"],
				},
				getEnvVars,
				cli: {
					prepare,
					serve: vi.fn(),
					build: vi.fn(),
				},
			} as never,
			db,
			config: (env) => ({
				secrets: {
					encryption: env.SECRET as string,
					cookie: env.SECRET as string,
					refreshToken: env.SECRET as string,
					accessToken: env.SECRET as string,
				},
				collections: [],
				plugins: [
					{
						key: "prepare-plugin",
						lucid: "0.0.0",
						hooks: {
							runtime: runtimeHook,
						},
						recipe: () => undefined,
					},
				],
			}),
		}),
		configPath: "/tmp/lucid.config.ts",
		projectRoot: "/tmp",
		prepareRuntime: true,
		processConfigOptions: {
			bypassCache: true,
			skipValidation: true,
		},
	});

	expect(prepare).toHaveBeenCalledTimes(2);
	// @ts-expect-error
	expect(prepare.mock.calls[0]?.[0].prepareArtifacts).toEqual({
		custom: [],
	});
	// @ts-expect-error
	expect(prepare.mock.calls[1]?.[0].prepareArtifacts.custom).toEqual([
		{
			type: "test:prepare",
			custom: {
				source: "db",
			},
		},
		{
			type: "test:prepare",
			custom: {
				source: "plugin",
			},
		},
	]);
	expect(runtimeHook).toHaveBeenCalledWith(
		expect.objectContaining({
			phase: "prepare",
			env: {
				SECRET: "a".repeat(64),
			},
			paths: {
				configPath: "/tmp/lucid.config.ts",
				projectRoot: "/tmp",
			},
		}),
	);
	expect(getEnvVars).toHaveBeenCalledTimes(2);
});
