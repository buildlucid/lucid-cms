import type { RunReport } from "../types.ts";

/** Set both to send results. The host is the project's ingestion address, such as `https://eu.i.posthog.com`. */
export const POSTHOG_KEY_ENV = "HARNESS_POSTHOG_KEY";
export const POSTHOG_HOST_ENV = "HARNESS_POSTHOG_HOST";

const DEFAULT_HOST = "https://eu.i.posthog.com";
const BATCH_SIZE = 500;

/**
 * Sends run, test and measurement events to PostHog when configured. Logs send failures without
 * failing the run.
 */
const sendToPosthog = async (report: RunReport): Promise<void> => {
	const key = process.env[POSTHOG_KEY_ENV];
	if (!key) {
		return;
	}

	const shared = {
		run_id: report.runId,
		commit: report.git.commit,
		branch: report.git.branch,
		node: report.node,
		ci: report.ci,
		seed: report.seed,
	};
	const event = (name: string, properties: Record<string, unknown>) => ({
		event: name,
		distinct_id: "lucid-test-harness",
		timestamp: report.startedAt,
		properties: { ...shared, ...properties },
	});

	const events = [
		event("harness_run", {
			duration_ms: report.durationMs,
			mismatches: report.mismatches.length,
			...report.summary,
		}),
		...report.lanes.flatMap((lane) =>
			lane.tests.map((test) =>
				event("harness_test", {
					test_id: test.id,
					setup: lane.setup,
					lane: lane.lane,
					mode: lane.mode,
					file: test.file,
					status: test.status,
					duration_ms: test.durationMs,
					flaky: test.flaky,
					skip_reason: test.skipReason,
				}),
			),
		),
		...report.lanes.flatMap((lane) =>
			lane.measurements.map((measurement) =>
				event("harness_measurement", {
					measurement_id: measurement.id,
					setup: lane.setup,
					unit: measurement.unit,
					value: measurement.value,
					spread: measurement.spread,
				}),
			),
		),
	];

	const url = new URL("/batch/", process.env[POSTHOG_HOST_ENV] || DEFAULT_HOST);
	try {
		for (let start = 0; start < events.length; start += BATCH_SIZE) {
			const response = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					api_key: key,
					batch: events.slice(start, start + BATCH_SIZE),
				}),
			});
			if (!response.ok) {
				throw new Error(`PostHog answered ${response.status}`);
			}
		}
	} catch (error) {
		console.warn(`Could not send results to PostHog: ${String(error)}`);
	}
};

export default sendToPosthog;
