import { expect, test, vi } from "vitest";
import type DatabaseAdapter from "../db/adapter-base.js";
import {
	createDatabaseAdapterCreator,
	createDatabaseAdapterFactory,
} from "../db/adapter-factory.js";
import resolveDatabaseAdapter from "./resolve-database-adapter.js";

const createAdapter = (adapter = "test") =>
	({
		adapter,
		connect: vi.fn(),
		inferSchema: vi.fn(),
		dropAllTables: vi.fn(),
	}) as unknown as DatabaseAdapter;

test("resolves a concrete database adapter", async () => {
	const adapter = createAdapter();

	await expect(resolveDatabaseAdapter(adapter, undefined)).resolves.toBe(
		adapter,
	);
});

test("resolves a promised concrete database adapter", async () => {
	const adapter = createAdapter();

	await expect(
		resolveDatabaseAdapter(Promise.resolve(adapter), {}),
	).resolves.toBe(adapter);
});

test("resolves a deferred database adapter with env", async () => {
	const adapter = createAdapter("deferred");
	const factory = createDatabaseAdapterFactory({
		adapter: "deferred",
		resolve: vi.fn((env) => {
			expect(env).toEqual({ DATABASE_URL: "file:test.db" });
			return adapter;
		}),
	});

	await expect(
		resolveDatabaseAdapter(factory, { DATABASE_URL: "file:test.db" }),
	).resolves.toBe(adapter);
	expect(factory.resolve).toHaveBeenCalledOnce();
});

test("resolves a branded no-call database adapter creator with env", async () => {
	const adapter = createAdapter("creator");
	const creator = createDatabaseAdapterCreator(() => adapter, {
		adapter: "creator",
		resolve: vi.fn((env) => {
			expect(env).toEqual({ DATABASE_URL: "file:test.db" });
			return adapter;
		}),
	});

	await expect(
		resolveDatabaseAdapter(creator, { DATABASE_URL: "file:test.db" }),
	).resolves.toBe(adapter);
	expect(creator.resolve).toHaveBeenCalledOnce();
});

test("rejects a bare database callback", async () => {
	const callback = (() => createAdapter()) as unknown as Parameters<
		typeof resolveDatabaseAdapter
	>[0];

	await expect(resolveDatabaseAdapter(callback, {})).rejects.toThrow(
		"Top-level `db: (env) => ...` callbacks are not supported.",
	);
});

test("rejects a deferred database adapter that resolves to a non-adapter", async () => {
	const factory = createDatabaseAdapterFactory({
		adapter: "invalid",
		resolve: () => ({ adapter: "invalid" }) as unknown as DatabaseAdapter,
	});

	await expect(resolveDatabaseAdapter(factory, {})).rejects.toThrow(
		"Lucid could not resolve the configured database adapter.",
	);
});
