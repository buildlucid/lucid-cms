import { afterEach, describe, expect, test, vi } from "vitest";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { isTelemetryEnabled } from "./config.js";

const config = (telemetry: boolean) => ({ telemetry }) as ResolvedLucidConfig;

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("telemetry configuration", () => {
	test("is enabled by config by default", () => {
		vi.stubEnv("LUCID_TELEMETRY_DISABLED", "0");
		vi.stubEnv("DO_NOT_TRACK", "0");
		expect(isTelemetryEnabled(config(true))).toBe(true);
	});

	test("honours config and environment opt-outs", () => {
		expect(isTelemetryEnabled(config(false))).toBe(false);
		expect(
			isTelemetryEnabled(config(true), {
				LUCID_TELEMETRY_DISABLED: "1",
			}),
		).toBe(false);
		expect(isTelemetryEnabled(config(true), { DO_NOT_TRACK: "true" })).toBe(
			false,
		);
	});
});
