import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../../types/config.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import createCommandTelemetryReporter from "./command-reporter.js";
import reportTelemetry from "./report.js";

vi.mock("./report.js", () => ({
	default: vi.fn(),
}));

const runtimeContext = {
	runtime: "node",
	compiled: false,
	configEntryPoint: null,
	getConnectionInfo: () => ({}),
} satisfies AdapterRuntimeContext;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(reportTelemetry).mockResolvedValue();
});

describe("command telemetry reporter", () => {
	test("reports at most one outcome for a command invocation", async () => {
		const reporter = createCommandTelemetryReporter({
			config: { telemetry: true } as Config,
			runtimeContext,
			projectRoot: "/project",
			command: "dev",
			startedAt: Date.now(),
		});

		await reporter.report({ outcome: "failed", stage: "admin_build" });
		await reporter.report({ outcome: "succeeded", stage: "server_listen" });

		expect(reportTelemetry).toHaveBeenCalledOnce();
		expect(reportTelemetry).toHaveBeenCalledWith(
			expect.objectContaining({
				command: "dev",
				outcome: "failed",
				stage: "admin_build",
			}),
		);
	});
});
