import { expect, expectTypeOf, test, vi } from "vitest";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import { createDatabaseAdapterCreator } from "../db/adapter-factory.js";
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
