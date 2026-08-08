import { EventEmitter } from "node:events";
import { afterEach, describe, expect, test, vi } from "vitest";
import { destroyRuntimeHosts } from "../internal/runtime.js";
import {
	createDevServerLifecycle,
	teardownDevProject,
	teardownProject,
} from "./lifecycle.js";
import type { ResolvedLucidProject } from "./project.js";

vi.mock("../internal/runtime.js", () => ({
	destroyRuntimeHosts: vi.fn(),
}));

const createProject = (hostId = "lucid-project", teardown = vi.fn()) => {
	const adapter = { key: "test-runtime" };
	const project = {
		hostId,
		loaded: { adapter },
		integrationBridge: { teardown },
	} as unknown as ResolvedLucidProject;

	return { adapter, project, teardown };
};

const createProcess = () => {
	const emitter = new EventEmitter() as EventEmitter & {
		exit: NodeJS.Process["exit"];
		exitCode: NodeJS.Process["exitCode"];
	};
	const exit = vi.fn(() => undefined as never);
	emitter.exit = exit;
	emitter.exitCode = undefined;
	return { emitter, exit };
};

const deferred = () => {
	let resolve: () => void = () => {};
	const promise = new Promise<void>((nextResolve) => {
		resolve = nextResolve;
	});
	return { promise, resolve };
};

describe("Astro project lifecycle", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	test("passes the runtime adapter and command to integration teardown", async () => {
		const { adapter, project, teardown } = createProject();

		await teardownProject(project, "build");

		expect(teardown).toHaveBeenCalledWith({ adapter, command: "build" });
	});

	test("destroys runtime hosts before tearing down dev resources", async () => {
		const { project, teardown } = createProject();

		await teardownDevProject(project);

		expect(destroyRuntimeHosts).toHaveBeenCalledWith("lucid-project");
		expect(destroyRuntimeHosts).toHaveBeenCalledBefore(teardown);
		expect(teardown).toHaveBeenCalledWith({
			adapter: project.loaded.adapter,
			command: "dev",
		});
	});

	test("tears down dev resources when runtime host cleanup fails", async () => {
		const error = new Error("Host cleanup failed");
		vi.mocked(destroyRuntimeHosts).mockRejectedValueOnce(error);
		const { project, teardown } = createProject();

		await expect(teardownDevProject(project)).rejects.toBe(error);
		expect(teardown).toHaveBeenCalledOnce();
	});
});

describe("Astro dev server lifecycle", () => {
	afterEach(() => {
		vi.resetAllMocks();
	});

	test("registers once and removes only its own signal listeners", async () => {
		const { emitter } = createProcess();
		const existingSigint = vi.fn();
		const existingSigterm = vi.fn();
		emitter.on("SIGINT", existingSigint);
		emitter.on("SIGTERM", existingSigterm);
		const lifecycle = createDevServerLifecycle({
			runtimeProcess: emitter as never,
		});

		lifecycle.register();
		lifecycle.register();

		expect(emitter.listenerCount("SIGINT")).toBe(2);
		expect(emitter.listenerCount("SIGTERM")).toBe(2);

		await lifecycle.shutdown();

		expect(emitter.listeners("SIGINT")).toEqual([existingSigint]);
		expect(emitter.listeners("SIGTERM")).toEqual([existingSigterm]);
	});

	test("tears down the project and Vite server exactly once", async () => {
		const { emitter, exit } = createProcess();
		const { project, teardown } = createProject();
		const server = { close: vi.fn() };
		const lifecycle = createDevServerLifecycle({
			runtimeProcess: emitter as never,
		});
		lifecycle.trackProject(project);
		await lifecycle.activateProject(project);
		lifecycle.setServer(server);

		const firstShutdown = lifecycle.shutdown();
		expect(lifecycle.shutdown()).toBe(firstShutdown);
		await firstShutdown;

		expect(destroyRuntimeHosts).toHaveBeenCalledOnce();
		expect(teardown).toHaveBeenCalledOnce();
		expect(server.close).toHaveBeenCalledOnce();
		expect(exit).not.toHaveBeenCalled();
		await lifecycle.releaseProject(project);
		expect(teardown).toHaveBeenCalledOnce();
	});

	test("releases the previous project during a Vite restart", async () => {
		const { emitter } = createProcess();
		const previous = createProject("previous-project");
		const replacement = createProject("replacement-project");
		const lifecycle = createDevServerLifecycle({
			runtimeProcess: emitter as never,
		});
		lifecycle.trackProject(previous.project);
		await lifecycle.activateProject(previous.project);
		lifecycle.trackProject(replacement.project);

		await lifecycle.activateProject(replacement.project);

		expect(previous.teardown).toHaveBeenCalledOnce();
		expect(replacement.teardown).not.toHaveBeenCalled();
		await lifecycle.shutdown();
		expect(previous.teardown).toHaveBeenCalledOnce();
		expect(replacement.teardown).toHaveBeenCalledOnce();
	});

	test.each([
		["SIGINT", 130],
		["SIGTERM", 143],
	] as const)("awaits teardown before exiting for %s with status %i", async (signal, exitCode) => {
		const { emitter, exit } = createProcess();
		const cleanup = deferred();
		const { project, teardown } = createProject(
			"signal-project",
			vi.fn(() => cleanup.promise),
		);
		const server = { close: vi.fn() };
		const externalListener = vi.fn(() => emitter.exit(0));
		emitter.on(signal, externalListener);
		const lifecycle = createDevServerLifecycle({
			runtimeProcess: emitter as never,
		});
		lifecycle.trackProject(project);
		await lifecycle.activateProject(project);
		lifecycle.setServer(server);
		lifecycle.register();

		emitter.emit(signal, signal);
		emitter.emit(signal, signal);

		expect(externalListener).toHaveBeenCalledTimes(2);
		expect(exit).not.toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(server.close).toHaveBeenCalledOnce();
			expect(teardown).toHaveBeenCalledOnce();
		});

		cleanup.resolve();
		await vi.waitFor(() => {
			expect(exit).toHaveBeenCalledOnce();
		});

		expect(exit).toHaveBeenCalledWith(exitCode);
		expect(emitter.exitCode).toBe(exitCode);
		expect(emitter.listeners(signal)).toEqual([externalListener]);
	});

	test("closes every resource even when one teardown fails", async () => {
		const { emitter } = createProcess();
		const error = new Error("Proxy disposal failed");
		const failed = createProject(
			"failed-project",
			vi.fn().mockRejectedValue(error),
		);
		const healthy = createProject("healthy-project");
		const server = { close: vi.fn() };
		const lifecycle = createDevServerLifecycle({
			runtimeProcess: emitter as never,
		});
		lifecycle.trackProject(failed.project);
		lifecycle.trackProject(healthy.project);
		lifecycle.setServer(server);

		await expect(lifecycle.shutdown()).rejects.toBe(error);

		expect(failed.teardown).toHaveBeenCalledOnce();
		expect(healthy.teardown).toHaveBeenCalledOnce();
		expect(server.close).toHaveBeenCalledOnce();
	});
});
