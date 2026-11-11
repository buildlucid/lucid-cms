import type { Measurement } from "./types.ts";

/** A measurement with the figures that belong to it, such as a timing's 95th percentile. */
export type MeasurementGroup = {
	id: string;
	label: string;
	value: Measurement;
	p95?: Measurement;
	queries?: Measurement;
};

/** The ID endings benchmarks give a measurement's companion figures. See `documents.bench.ts`. */
const COMPANIONS = { p95: ".p95", queries: ".queries" } as const;

/**
 * Groups companion metrics into one report row, such as `read.single.p95` and
 * `read.single.queries` under `read.single`.
 */
const groupMeasurements = (
	measurements: readonly Measurement[],
): MeasurementGroup[] => {
	const byId = new Map(
		measurements.map((measurement) => [measurement.id, measurement]),
	);
	const companionOf = (id: string) =>
		Object.values(COMPANIONS).some(
			(ending) => id.endsWith(ending) && byId.has(id.slice(0, -ending.length)),
		);

	return measurements
		.filter((measurement) => !companionOf(measurement.id))
		.map((measurement) => ({
			id: measurement.id,
			label: measurement.label,
			value: measurement,
			p95: byId.get(`${measurement.id}${COMPANIONS.p95}`),
			queries: byId.get(`${measurement.id}${COMPANIONS.queries}`),
		}));
};

export default groupMeasurements;
