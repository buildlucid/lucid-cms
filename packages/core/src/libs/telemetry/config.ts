import type { Config } from "../../types/config.js";
import type { EnvironmentVariables } from "../runtime/types.js";

export const TELEMETRY_DISABLED_ENV = "LUCID_TELEMETRY_DISABLED";

const getEnvValue = (
	env: EnvironmentVariables | undefined,
	key: string,
): unknown => env?.[key] ?? process.env[key];

const isEnabledFlag = (value: unknown) => {
	if (value === true || value === 1) return true;
	if (typeof value !== "string") return false;
	return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

/** Resolves config and conventional environment opt-outs before any I/O. */
export const isTelemetryEnabled = (
	config: Config,
	env?: EnvironmentVariables,
) =>
	config.telemetry &&
	!isEnabledFlag(getEnvValue(env, TELEMETRY_DISABLED_ENV)) &&
	!isEnabledFlag(getEnvValue(env, "DO_NOT_TRACK"));

export const getTelemetryEnvValue = getEnvValue;
export const isTelemetryEnvFlagEnabled = isEnabledFlag;
