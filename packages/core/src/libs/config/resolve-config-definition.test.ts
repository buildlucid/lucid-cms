import { expect, test, vi } from "vitest";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import { createDatabaseAdapterCreator } from "../db/adapter-factory.js";
import defineConfig from "../runtime/define-config.js";
import resolveConfigDefinition from "./resolve-config-definition.js";

const createAdapter = (adapter = "test") =>
	({
		adapter,
		connect: vi.fn(),
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
		definition: defineConfig({
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
			skipValidation: true,
		},
	});

	expect(result.adapter.key).toBe("node");
	expect(result.config.db).toBe(adapter);
	expect(db.resolve).toHaveBeenCalledOnce();
});

test("resolves a named env schema supplied separately from the config definition", async () => {
	const adapter = createAdapter("named-env");
	const env = z.object({
		SECRET: z.string(),
	});
	const definition = defineConfig({
		runtime: {
			key: "node",
			lucid: "0.0.0",
		},
		db: adapter,
		config: (env) => {
			const secret = env.SECRET as string;
			return {
				secrets: {
					encryption: secret,
					cookie: secret,
					refreshToken: secret,
					accessToken: secret,
				},
				collections: [],
				plugins: [],
			};
		},
	});

	const result = await resolveConfigDefinition({
		definition,
		envSchema: env,
		env: {
			SECRET: "a".repeat(64),
		},
		processConfigOptions: {
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
	const definition = defineConfig({
		runtime: {
			key: "node",
			lucid: "0.0.0",
		},
		db: adapter,
		config: (env) => ({
			secrets: env.SECRET as string,
			collections: [],
			plugins: [],
		}),
	});

	await expect(
		resolveConfigDefinition({
			definition,
			envSchema: env,
			env: {},
			processConfigOptions: {
				mode: "build",
			},
		}),
	).rejects.toThrow();

	const result = await resolveConfigDefinition({
		definition,
		envSchema: env,
		env: {},
		validateEnvSchema: false,
		processConfigOptions: {
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

test("parsed env output reaches every consumer while runtime bindings survive", async () => {
	const binding = { get: vi.fn() };
	const transform = vi.fn((value: string) => `${value}:parsed`);
	const resolveOptions = vi.fn();
	const database = createAdapter("parsed-env");
	const resolveDatabase = vi.fn(() => database);
	const definition = defineConfig({
		runtime: { key: "test", lucid: "*", resolveOptions },
		db: createDatabaseAdapterCreator(() => database, {
			adapter: "test",
			resolve: resolveDatabase,
		}),
		config: (env) => {
			expect(env).toMatchObject({
				PORT: 4000,
				REGION: "eu",
				TOKEN: "raw:parsed",
				BINDING: binding,
			});
			return { collections: [], plugins: [] };
		},
	});
	const result = await resolveConfigDefinition({
		definition,
		env: { PORT: "4000", TOKEN: "raw", BINDING: binding },
		envSchema: z.object({
			PORT: z.coerce.number(),
			REGION: z.string().default("eu"),
			TOKEN: z.string().transform(transform),
		}),
		processConfigOptions: { skipValidation: true },
	});
	expect(transform).toHaveBeenCalledOnce();
	expect(result.env?.BINDING).toBe(binding);
	expect(resolveOptions).toHaveBeenCalledWith(result.env);
	expect(resolveDatabase).toHaveBeenCalledWith(result.env);
});

test("rejects a declared host the runtime doesn't support", async () => {
	await expect(
		resolveConfigDefinition({
			definition: defineConfig({
				runtime: { key: "node", lucid: "0.0.0" },
				host: { key: "astro", cli: "@lucidcms/astro/cli" },
				db: createAdapter(),
				config: () => ({ secrets: "a".repeat(64) }),
			}),
		}),
	).rejects.toThrow('The "node" runtime doesn\'t support the "astro" host.');
});
