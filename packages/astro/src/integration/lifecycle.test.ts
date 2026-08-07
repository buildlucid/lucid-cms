import { afterEach, describe, expect, test, vi } from "vitest";
import { destroyRuntimeHosts } from "../internal/runtime.js";
import { teardownDevProject, teardownProject } from "./lifecycle.js";
import type { ResolvedLucidProject } from "./project.js";

vi.mock("../internal/runtime.js", () => ({
	destroyRuntimeHosts: vi.fn(),
}));

const createProject = (teardown = vi.fn()) => {
	const adapter = { key: "test-runtime" };
	const project = {
		hostId: "lucid-project",
		loaded: { adapter },
		integrationBridge: { teardown },
	} as unknown as ResolvedLucidProject;

	return { adapter, project, teardown };
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
