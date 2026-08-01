import type { EnvironmentVariables } from "../../../runtime/types.js";
import type { TelemetryEnvelope } from "../../../telemetry/types.js";
import { getLucidRemotePublicClient } from "../../public-client.js";

const TELEMETRY_PATH = "/v1/telemetry/events" as const;

/**
 * Sends one write-only telemetry envelope to Lucid Remote. The public endpoint
 * owns schema validation, rate limiting, deduplication, and forwarding to
 * PostHog with server-held credentials; clients never receive a PostHog key.
 */
const sendTelemetryEvent = (
	env: EnvironmentVariables | undefined,
	event: TelemetryEnvelope,
) =>
	getLucidRemotePublicClient(env).post(TELEMETRY_PATH, event, {
		timeoutMs: 750,
	});

export default sendTelemetryEvent;
