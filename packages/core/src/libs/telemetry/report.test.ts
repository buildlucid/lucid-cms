import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../../types/config.js";
import sendTelemetryEvent from "../lucid-remote/services/telemetry/index.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import { getOrCreateTelemetryId } from "./identity.js";
import reportTelemetry from "./report.js";

vi.mock("../lucid-remote/services/telemetry/index.js", () => ({
	default: vi.fn(),
}));
vi.mock("./identity.js", () => ({
	getOrCreateTelemetryId: vi.fn(),
}));

const config = {
	telemetry: true,
	db: { adapter: "sqlite" },
	tables: [],
	localization: { locales: [{ label: "English", code: "en" }] },
	ai: { enabled: false },
	http: { openAPI: { enabled: false } },
	auth: { password: { enabled: true }, providers: [] },
	collections: [],
	plugins: [],
} as unknown as Config;

const runtimeContext = {
	runtime: "node",
	compiled: false,
	configEntryPoint: null,
	getConnectionInfo: () => ({}),
} satisfies AdapterRuntimeContext;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(getOrCreateTelemetryId).mockResolvedValue(
		"2a505315-aca3-4697-bfd2-cb60e842cf2a",
	);
	vi.mocked(sendTelemetryEvent).mockResolvedValue(true);
});

describe("reportTelemetry", () => {
	test("sends the fixed versioned lifecycle envelope", async () => {
		await reportTelemetry({
			config,
			runtimeContext,
			projectRoot: "/project",
			command: "build",
			outcome: "failed",
			stage: "runtime_build",
			durationMs: 125.6,
			env: {
				LUCID_TELEMETRY_DISABLED: "0",
				DO_NOT_TRACK: "0",
			},
		});

		expect(sendTelemetryEvent).toHaveBeenCalledOnce();
		const [, envelope] = vi.mocked(sendTelemetryEvent).mock.calls[0] ?? [];
		expect(envelope).toMatchObject({
			schema_version: 1,
			installation_id: "2a505315-aca3-4697-bfd2-cb60e842cf2a",
			event: {
				name: "lucid.command.completed",
				command: "build",
				outcome: "failed",
				stage: "runtime_build",
				duration_ms: 126,
			},
			context: {
				runtime: "node",
				adapters: { database: "sqlite" },
			},
		});
		expect(envelope?.event_id).toMatch(/^[0-9a-f-]{36}$/);
		expect(envelope?.occurred_at).toBeTypeOf("string");
		expect(Object.keys(envelope ?? {}).sort()).toEqual([
			"context",
			"event",
			"event_id",
			"installation_id",
			"occurred_at",
			"schema_version",
		]);
		expect(Object.keys(envelope?.event ?? {}).sort()).toEqual([
			"command",
			"duration_ms",
			"name",
			"outcome",
			"stage",
		]);
		expect(Object.keys(envelope?.context ?? {}).sort()).toEqual([
			"adapters",
			"architecture",
			"compiled",
			"counts",
			"environment",
			"features",
			"is_ci",
			"lucid_version",
			"node_major",
			"package_manager",
			"platform",
			"runtime",
		]);
	});

	test("does no identity or network I/O after opt-out", async () => {
		await reportTelemetry({
			config: { ...config, telemetry: false },
			runtimeContext,
			projectRoot: "/project",
			command: "dev",
			outcome: "succeeded",
			stage: "server_listen",
		});

		expect(getOrCreateTelemetryId).not.toHaveBeenCalled();
		expect(sendTelemetryEvent).not.toHaveBeenCalled();
	});

	test("contains remote sender failures", async () => {
		vi.mocked(sendTelemetryEvent).mockRejectedValueOnce(
			new Error("remote unavailable"),
		);

		await expect(
			reportTelemetry({
				config,
				runtimeContext,
				projectRoot: "/project",
				command: "serve",
				outcome: "failed",
				stage: "server_listen",
			}),
		).resolves.toBeUndefined();
	});
});
