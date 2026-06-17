import { expect, test, vi } from "vitest";
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
