import { describe, expect, test, vi } from "vitest";
import type { Config } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { DatabaseConnection } from "../db/types.js";
import createLucidHost from "./create-lucid-host.js";

const runtimeContext = {
	runtime: "test",
	compiled: false,
	configEntryPoint: null,
	getConnectionInfo: () => ({}),
};

const createFixture = () => {
	const connections: DatabaseConnection[] = [];
	const connect = vi.fn(async (_env?: Record<string, unknown>) => {
		const connection = {
			client: {} as DatabaseConnection["client"],
			destroy: vi.fn(async () => undefined),
		};
		connections.push(connection);
		return connection;
	});
	const adapter = {
		adapter: "test",
		connect,
		dropAllTables: vi.fn(),
		inferSchema: vi.fn(),
	} as unknown as DatabaseAdapter;
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
				collections: [],
				plugins: [
					{
						key: "host-lifecycle-test",
						lucid: "*",
						hooks: { init: pluginInit },
						recipe: () => undefined,
					},
				],
			}),
		},
		pluginInit,
	};
};

describe("createLucidHost database ownership", () => {
	test("creates and releases one database connection per invocation", async () => {
		const fixture = createFixture();
		const host = await createLucidHost({
			definition: fixture.definition,
			runtimeContext,
			databaseScope: "invocation",
		});
		expect(fixture.pluginInit).toHaveBeenCalledOnce();
		expect(fixture.connect).not.toHaveBeenCalled();

		const first = host.createInvocation();
		const second = host.createInvocation();

		await Promise.all([first.getToolkit(), second.getToolkit()]);

		expect(fixture.connect).toHaveBeenCalledTimes(2);

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

		await Promise.all([first.getToolkit(), second.getToolkit()]);
		await Promise.all([first.destroy(), second.destroy()]);

		expect(fixture.connect).toHaveBeenCalledOnce();
		expect(fixture.connections[0]?.destroy).not.toHaveBeenCalled();

		await host.destroy();
		expect(fixture.connections[0]?.destroy).toHaveBeenCalledOnce();
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
						priority: 2,
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

		expect((host.config as Config).db).toBe(fixture.adapter);
		expect("client" in host.config.db).toBe(false);
		await host.destroy();
	});
});
