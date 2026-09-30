import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { describe, expect, test, vi } from "vitest";
import z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { defineTable } from "../db/client/table/definition.js";
import type { DatabaseConnection } from "../db/types.js";
import logger from "../logger/index.js";
import type { QueueAdapterInstance } from "../queue/types.js";
import createLucidHost from "./create-lucid-host.js";
import withResponseCleanup from "./with-response-cleanup.js";

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

describe("createLucidHost background work", () => {
	test("keeps SQLite and toolkit access alive after body cancellation until all background work settles", async () => {
		const fixture = createFixture();
		const adapter = new SQLiteAdapter({ database: ":memory:" });
		const connect = adapter.connect.bind(adapter);
		let connection: DatabaseConnection | undefined;
		vi.spyOn(adapter, "connect").mockImplementation(async (env) => {
			connection = await connect(env);
			vi.spyOn(connection, "destroy");
			return connection;
		});
		const resumeFirst = Promise.withResolvers<void>();
		const resumeSecond = Promise.withResolvers<void>();
		const firstFinished = Promise.withResolvers<void>();
		const bodyCancelled = Promise.withResolvers<void>();
		const cleanupStarted = Promise.withResolvers<void>();
		const queryResults: number[] = [];
		let toolkitAvailable = false;
		const host = await createLucidHost({
			definition: { ...fixture.definition, db: adapter },
			runtimeContext,
			databaseScope: "invocation",
			http: {
				extensions: [
					{
						name: "background-lifecycle-test",
						phase: "afterSetup",
						register: (app) => {
							app.get("/background", (context) => {
								const executionContext = context.get("ctx");
								if (!executionContext) throw new Error("Missing context");
								const secondTask = resumeSecond.promise.then(async () => {
									const toolkit = await invocation.getToolkit();
									toolkitAvailable =
										typeof toolkit.collections.getSchema === "function";
									const services = await invocation.getServiceContext();
									const row = await services.db.kysely
										.selectNoFrom((expression) => expression.val(2).as("value"))
										.executeTakeFirstOrThrow();
									queryResults.push(row.value);
								});
								executionContext.waitUntil(
									resumeFirst.promise.then(async () => {
										const services = await invocation.getServiceContext();
										const row = await services.db.kysely
											.selectNoFrom((expression) =>
												expression.val(1).as("value"),
											)
											.executeTakeFirstOrThrow();
										queryResults.push(row.value);
										executionContext.waitUntil(secondTask);
										firstFinished.resolve();
									}),
								);
								return new Response(
									new ReadableStream<Uint8Array>({
										start: (controller) =>
											controller.enqueue(
												new TextEncoder().encode("data: open\n\n"),
											),
										cancel: () => bodyCancelled.resolve(),
									}),
									{ headers: { "Content-Type": "text/event-stream" } },
								);
							});
						},
					},
				],
			},
		});
		const invocation = host.createInvocation();
		try {
			const response = await withResponseCleanup(
				await invocation.handle({
					request: new Request("http://localhost/background"),
				}),
				() => {
					const destruction = invocation.destroy();
					cleanupStarted.resolve();
					return destruction;
				},
			);
			const cancellation = response.body?.cancel();
			await bodyCancelled.promise;
			await cleanupStarted.promise;
			expect(connection?.destroy).not.toHaveBeenCalled();
			await expect(
				invocation.handle({
					request: new Request("http://localhost/background"),
				}),
			).rejects.toThrow(
				"Cannot handle a request after a Lucid invocation has started closing.",
			);

			resumeFirst.resolve();
			await firstFinished.promise;
			expect(queryResults).toEqual([1]);
			expect(connection?.destroy).not.toHaveBeenCalled();

			resumeSecond.resolve();
			await cancellation;
			await invocation.destroy();
			expect(queryResults).toEqual([1, 2]);
			expect(toolkitAvailable).toBe(true);
			expect(connection?.destroy).toHaveBeenCalledOnce();
			await expect(invocation.getToolkit()).rejects.toThrow(
				"Cannot use a Lucid invocation after it has been destroyed.",
			);
		} finally {
			resumeFirst.resolve();
			resumeSecond.resolve();
			await host.destroy();
		}
	});

	test("forwards tracked work and preserves the platform context method receivers", async () => {
		const fixture = createFixture();
		const resume = Promise.withResolvers<void>();
		const platformContext = {
			waitUntil: vi.fn((_promise: Promise<unknown>) => undefined),
			passThroughOnException: vi.fn(),
			props: { platform: "worker" },
			exports: { binding: "service" },
		};
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "invocation",
			http: {
				extensions: [
					{
						name: "platform-context-test",
						phase: "afterSetup",
						register: (app) => {
							app.get("/background", (context) => {
								context.get("ctx")?.waitUntil(resume.promise);
								context.get("ctx")?.passThroughOnException?.();
								return context.json({
									propsPreserved:
										context.executionCtx.props === platformContext.props,
									exportsPreserved:
										context.executionCtx.exports === platformContext.exports,
								});
							});
						},
					},
				],
			},
		});
		const invocation = host.createInvocation();
		try {
			const response = await invocation.handle({
				request: new Request("http://localhost/background"),
				executionContext: platformContext,
			});
			expect(await response.json()).toEqual({
				propsPreserved: true,
				exportsPreserved: true,
			});
			expect(platformContext.waitUntil).toHaveBeenCalledOnce();
			expect(platformContext.waitUntil.mock.contexts[0]).toBe(platformContext);
			expect(platformContext.passThroughOnException).toHaveBeenCalledOnce();
			expect(platformContext.passThroughOnException.mock.contexts[0]).toBe(
				platformContext,
			);
			const destruction = host.destroy();
			expect(fixture.connections[0]?.destroy).not.toHaveBeenCalled();
			await expect(invocation.getToolkit()).resolves.toBeDefined();
			resume.resolve();
			await destruction;
			await expect(
				platformContext.waitUntil.mock.calls[0]?.[0],
			).resolves.toBeUndefined();
			expect(fixture.connections[0]?.destroy).toHaveBeenCalledOnce();
		} finally {
			resume.resolve();
			await host.destroy();
		}
	});

	test("logs rejected background work and still releases invocation resources", async () => {
		const fixture = createFixture();
		const failure = new Error("Background task failed");
		const reportError = vi
			.spyOn(logger, "error")
			.mockImplementation(() => undefined);
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "invocation",
			http: {
				extensions: [
					{
						name: "background-error-test",
						phase: "afterSetup",
						register: (app) => {
							app.get("/background", (context) => {
								context.get("ctx")?.waitUntil(Promise.reject(failure));
								return context.text("ok");
							});
						},
					},
				],
			},
		});
		try {
			const invocation = host.createInvocation();
			await invocation.handle({
				request: new Request("http://localhost/background"),
			});
			await invocation.destroy();
			expect(reportError).toHaveBeenCalledWith(
				expect.objectContaining({
					event: "runtime.background-task.failed",
					error: failure,
				}),
			);
			expect(fixture.connections[0]?.destroy).toHaveBeenCalledOnce();
		} finally {
			await host.destroy();
			reportError.mockRestore();
		}
	});
});
