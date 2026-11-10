import type { Measurement } from "../report/types.ts";
import type { Metric } from "./types.ts";

const median = (values: readonly number[]): number => {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	const upper = sorted[middle] ?? 0;
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + upper) / 2
		: upper;
};

const TIMING_TOLERANCE = 0.15;
const EXACT_TOLERANCE = 0.01;

/** Scales the median absolute deviation to match a standard deviation for normal data. */
const MAD_TO_DEVIATION = 1.4826;

/**
 * Summarizes each metric with its median and sample variation, resisting occasional slow samples.
 */
const summarizeSamples = (
	benchmarkId: string,
	samples: ReadonlyArray<Record<string, Metric>>,
): Measurement[] => {
	const [first] = samples;
	if (!first) {
		return [];
	}

	return Object.entries(first).map(([key, metric]) => {
		const values = samples.map((sample) => sample[key]?.value ?? 0);
		const middle = median(values);
		const deviation = median(values.map((value) => Math.abs(value - middle)));

		return {
			id: `${benchmarkId}.${key}`,
			label: metric.label,
			unit: metric.unit,
			value: middle,
			samples: values,
			spread: middle === 0 ? 0 : (deviation * MAD_TO_DEVIATION) / middle,
			tolerance:
				metric.tolerance ??
				(metric.unit === "ms" ? TIMING_TOLERANCE : EXACT_TOLERANCE),
			blocking: metric.blocking ?? metric.unit !== "ms",
		};
	});
};

export default summarizeSamples;
