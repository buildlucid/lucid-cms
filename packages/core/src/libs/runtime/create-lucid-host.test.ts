import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { describe, expect, test, vi } from "vitest";
import z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { defineTable } from "../db/client/table/definition.js";
import type { DatabaseConnection } from "../db/types.js";
import type { QueueAdapterInstance } from "../queue/types.js";
import createLucidHost from "./create-lucid-host.js";

const runtimeContext = {
	runtime: "test",
	compiled: false,
	configEntryPoint: null,
	getConnectionInfo: () => ({}),
};

type PluginMetadataRow = {
	payload: Record<string, unknown>;
};

const pluginMetadataTable = defineTable<PluginMetadataRow>("plugin_metadata", {
	columns: {
		payload: {
			schema: z.record(z.string(), z.unknown()),
			type: "json",
		},
	},
});

const createFixture = () => {
	const connections: DatabaseConnection[] = [];
	const healthCheck = vi.fn(async () => ({ health: 1 }));
	const selectNoFrom = vi.fn(() => ({
		executeTakeFirstOrThrow: healthCheck,
	}));
	const connect = vi.fn(async (_env?: Record<string, unknown>) => {
		const client = {
			selectNoFrom,
			withPlugin: vi.fn(),
		};
		client.withPlugin.mockReturnValue(client);
		const connection = {
			client: client as unknown as DatabaseConnection["client"],
			destroy: vi.fn(async () => undefined),
		};
		connections.push(connection);
		return connection;
	});
	const adapter = new SQLiteAdapter({ database: ":memory:" });
	adapter.adapter = "test";
	adapter.connect = connect as DatabaseAdapter["connect"];
	adapter.dropAllTables = vi.fn();
	adapter.inferSchema = vi.fn();
	const pluginInit = vi.fn(async () => ({
		data: undefined,
		error: undefined,
	}));

	return {
		adapter,
		connect,
		connections,
		definition: {
			runtime: {
				key: "test",
				lucid: "0.0.0",
			},
			db: adapter,
			config: () => ({
				tables: [pluginMetadataTable],
				collections: [],
				plugins: [
					{
						key: "host-lifecycle-test",
						lucid: "*",
						hooks: { init: pluginInit },
						configure: () => undefined,
					},
				],
			}),
		},
		healthCheck,
		pluginInit,
		selectNoFrom,
	};
};

describe("createLucidHost database ownership", () => {
	test("config and invocations share parsed env while fresh request bindings stay isolated", async () => {
		const fixture = createFixture();
		const transform = vi.fn((value: string) => Number(value));
		const envSchema = z.object({ PORT: z.string().transform(transform) });
		const binding = { fetch: vi.fn() };
		const rawEnv = { PORT: "6543", BINDING: binding };
		const config = vi.fn((env: Record<string, unknown>) => ({
			...fixture.definition.config(),
			brand: { name: String(env.PORT) },
		}));
		const host = await createLucidHost({
			definition: { ...fixture.definition, config },
			env: rawEnv,
			envSchema,
			runtimeContext,
			databaseScope: "invocation",
		});
		try {
			expect(config).toHaveBeenCalledWith(host.env);
			expect(host.config.brand.name).toBe("6543");
			const initial = await host
				.createInvocation({ env: rawEnv })
				.getServiceContext();
			const reused = await host
				.createInvocation({ env: host.env })
				.getServiceContext();
			expect(initial.env).toBe(host.env);
			expect(reused.env).toBe(host.env);
			expect(initial.env?.PORT).toBe(6543);
			expect(initial.env?.BINDING).toBe(binding);
			expect(transform).toHaveBeenCalledOnce();
			expect(rawEnv.PORT).toBe("6543");

			const nextBinding = { fetch: vi.fn() };
			const nextEnv = { PORT: "6544", BINDING: nextBinding };
			const next = await host
				.createInvocation({ env: nextEnv })
				.getServiceContext();
			const repeated = await host
				.createInvocation({ env: nextEnv })
				.getServiceContext();
			expect(next.env?.PORT).toBe(6544);
			expect(next.env?.BINDING).toBe(nextBinding);
			expect(repeated.env).toBe(next.env);
			expect(transform).toHaveBeenCalledTimes(2);
			expect(initial.env?.BINDING).toBe(binding);
			expect(() => host.createInvocation({ env: { PORT: false } })).toThrow();
		} finally {
			await host.destroy();
		}
	});

	test("creates and releases one database connection per invocation", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "invocation",
		});
		expect(fixture.pluginInit).toHaveBeenCalledOnce();
		expect(fixture.connect).not.toHaveBeenCalled();
		expect(host.adapterKeys.database).toBe("test");
		expect(Object.keys(host.adapterKeys).sort()).toEqual([
			"database",
			"email",
			"kv",
			"mediaDelivery",
			"mediaStorage",
			"queue",
		]);

		const first = host.createInvocation();
		const second = host.createInvocation();

		const [firstContext, repeatedFirstContext, secondContext] =
			await Promise.all([
				first.getServiceContext(),
				first.getServiceContext(),
				second.getServiceContext(),
			]);

		expect(fixture.connect).toHaveBeenCalledTimes(2);
		expect(firstContext.db).toBe(repeatedFirstContext.db);
		expect(firstContext.db).not.toBe(secondContext.db);
		expect(
			firstContext.db.tables.resolve("plugin_metadata")?.columns.payload?.codec
				.name,
		).toBe("json");

		await Promise.all([first.destroy(), second.destroy()]);
		expect(fixture.connections[0]?.destroy).toHaveBeenCalledOnce();
		expect(fixture.connections[1]?.destroy).toHaveBeenCalledOnce();
		await host.destroy();
	});

	test("shares one database connection for a runtime-scoped host", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "runtime",
		});
		const first = host.createInvocation();
		const second = host.createInvocation();

		const [firstContext, secondContext] = await Promise.all([
			first.getServiceContext(),
			second.getServiceContext(),
		]);
		await Promise.all([first.destroy(), second.destroy()]);

		expect(fixture.connect).toHaveBeenCalledOnce();
		expect(firstContext.db).toBe(secondContext.db);
		expect(fixture.connections[0]?.destroy).not.toHaveBeenCalled();

		await host.destroy();
		expect(fixture.connections[0]?.destroy).toHaveBeenCalledOnce();
	});

	test("uses and manages a queue adapter override", async () => {
		const fixture = createFixture();
		const queue: QueueAdapterInstance = {
			type: "queue-adapter",
			key: "host-owned",
			support: { delayedDelivery: true, maxDelayMs: null },
			lifecycle: {
				init: vi.fn(),
				destroy: vi.fn(),
			},
			publish: vi.fn(),
		};
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "runtime",
			adapterOverrides: { queue },
		});

		const context = await host.createInvocation().getServiceContext();

		expect(context.queue).toBe(queue);
		expect(host.adapterKeys.queue).toBe("host-owned");
		expect(queue.lifecycle?.init).toHaveBeenCalledOnce();

		await host.destroy();
		expect(queue.lifecycle?.destroy).toHaveBeenCalledOnce();
	});

	test("uses the host environment for a runtime-scoped connection", async () => {
		const fixture = createFixture();
		const hostEnv = { DATABASE_URL: "host" };
		const host = await createLucidHost({
			definition: fixture.definition,
			env: hostEnv,
			runtimeContext,
			databaseScope: "runtime",
		});
		const invocation = host.createInvocation({
			env: { DATABASE_URL: "invocation" },
		});

		await invocation.getToolkit();

		expect(fixture.connect).toHaveBeenCalledWith(hostEnv);
		await host.destroy();
	});

	test("destroys active invocations when the host is destroyed", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "invocation",
		});
		const invocation = host.createInvocation();
		await invocation.getToolkit();

		await host.destroy();

		expect(fixture.connections[0]?.destroy).toHaveBeenCalledOnce();
		await expect(invocation.getToolkit()).rejects.toThrow(
			"Cannot use a Lucid host after it has been destroyed.",
		);
	});

	test("preserves request binding descriptors when handling a request", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "invocation",
			http: {
				extensions: [
					{
						name: "request-bindings-test",
						phase: "afterSetup",
						register: (app) => {
							app.get("/request-bindings", (context) =>
								context.text(
									String(
										(context.env as Record<string, unknown> | undefined)
											?.socket,
									),
								),
							);
						},
					},
				],
			},
		});
		const requestBindings = {};
		Object.defineProperty(requestBindings, "socket", {
			get: () => "node-socket",
		});
		const invocation = host.createInvocation();

		const response = await invocation.handle({
			request: new Request("http://localhost/request-bindings"),
			requestBindings,
		});

		expect(await response.text()).toBe("node-socket");
		await host.destroy();
	});

	test("reports healthy when the database is reachable", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "runtime",
		});
		const invocation = host.createInvocation();

		const response = await invocation.handle({
			request: new Request("http://localhost/lucid/health"),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.json()).toEqual({ status: "ok" });
		expect(fixture.selectNoFrom).toHaveBeenCalledOnce();
		expect(fixture.healthCheck).toHaveBeenCalledOnce();
		await host.destroy();
	});

	test("reports unhealthy when the database cannot be queried", async () => {
		const fixture = createFixture();
		fixture.healthCheck.mockRejectedValueOnce(
			new Error("Database unavailable"),
		);
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "runtime",
		});
		const invocation = host.createInvocation();

		const response = await invocation.handle({
			request: new Request("http://localhost/lucid/health"),
		});

		expect(response.status).toBe(503);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.json()).toEqual({ status: "unhealthy" });
		await host.destroy();
	});

	test("creates a host from already resolved runtime values", async () => {
		const fixture = createFixture();
		const sourceHost = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "runtime",
		});
		const host = await createLucidHost({
			config: sourceHost.config,
			translationStore: sourceHost.translationStore,
			runtimeContext,
			databaseScope: "runtime",
		});

		expect(host.config).toBe(sourceHost.config);
		expect(host.translationStore).toBe(sourceHost.translationStore);
		expect(fixture.pluginInit).toHaveBeenCalledOnce();

		await Promise.all([host.destroy(), sourceHost.destroy()]);
	});

	test("keeps the static adapter on processed config", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "runtime",
		});

		expect((host.config as ResolvedLucidConfig).db).toBe(fixture.adapter);
		expect(host.config.tables).toEqual([pluginMetadataTable]);
		expect("client" in host.config.db).toBe(false);
		await host.destroy();
	});
});
