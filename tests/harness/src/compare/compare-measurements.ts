import type { LaneReport, Measurement } from "../report/types.ts";
import type { MeasurementChange, MeasurementVerdict } from "./types.ts";

/** A change must clear the samples' own variation by this many times before it counts. */
const SPREAD_FACTOR = 3;

const judge = (change: number, threshold: number): MeasurementVerdict => {
	if (change > threshold) {
		return "regression";
	}
	if (change < -threshold) {
		return "improvement";
	}
	return "unchanged";
};

const compareOne = (
	setup: string,
	head: Measurement,
	base: Measurement | undefined,
): MeasurementChange => {
	const threshold = Math.max(
		head.tolerance,
		SPREAD_FACTOR * Math.max(head.spread, base?.spread ?? 0),
	);
	const change =
		base && base.value !== 0 ? (head.value - base.value) / base.value : null;

	return {
		id: head.id,
		setup,
		label: head.label,
		unit: head.unit,
		base: base?.value ?? null,
		head: head.value,
		change,
		threshold,
		verdict: change === null ? "new" : judge(change, threshold),
		blocking: head.blocking,
	};
};

/**
 * Compares measurements between lane runs that both runs have. A measurement regressed when it
 * grew by more than its tolerance and by more than its samples varied, whichever is larger.
 */
const compareMeasurements = (
	pairs: ReadonlyArray<{ base: LaneReport; head: LaneReport }>,
): MeasurementChange[] =>
	pairs.flatMap(({ base, head }) => {
		const before = new Map(
			base.measurements.map((measurement) => [measurement.id, measurement]),
		);
		return head.measurements.map((measurement) =>
			compareOne(head.setup, measurement, before.get(measurement.id)),
		);
	});

export default compareMeasurements;
