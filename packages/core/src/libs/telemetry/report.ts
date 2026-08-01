import crypto from "node:crypto";
import sendTelemetryEvent from "../lucid-remote/services/telemetry/index.js";
import { isTelemetryEnabled } from "./config.js";
import { getTelemetryContext } from "./context.js";
import { getOrCreateTelemetryId } from "./identity.js";
import type { ReportTelemetryOptions, TelemetryEnvelope } from "./types.js";

const normalizeDuration = (durationMs: number | undefined) => {
	if (durationMs === undefined || !Number.isFinite(durationMs))
		return undefined;
	return Math.min(Math.max(Math.round(durationMs), 0), 86_400_000);
};

/**
 * Reports one lifecycle outcome. Every failure is contained so telemetry can
 * never change a command's result or produce a user-facing error.
 */
const reportTelemetry = async (options: ReportTelemetryOptions) => {
	if (!isTelemetryEnabled(options.config, options.env)) return;

	try {
		const duration = normalizeDuration(options.durationMs);
		const envelope: TelemetryEnvelope = {
			schema_version: 1,
			event_id: crypto.randomUUID(),
			installation_id: await getOrCreateTelemetryId(options.projectRoot),
			occurred_at: new Date().toISOString(),
			event: {
				name: "lucid.command.completed",
				command: options.command,
				outcome: options.outcome,
				stage: options.stage,
				...(duration === undefined ? {} : { duration_ms: duration }),
			},
			context: getTelemetryContext(options),
		};

		await sendTelemetryEvent(options.env, envelope);
	} catch {
		// Telemetry must never affect the command that emitted it.
	}
};

export default reportTelemetry;
