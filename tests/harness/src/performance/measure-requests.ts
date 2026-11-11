import countQueries from "../client/count-queries.ts";
import type { Metric } from "./types.ts";

type MeasuredResponse = { status: number; body: unknown; headers: Headers };

/** The value at a share of the way through the sorted values, such as 0.5 for the median. */
const at = (values: number[], share: number) =>
	values.toSorted((x, y) => x - y)[Math.floor((values.length - 1) * share)] ??
	0;

/**
 * Sends `requests` requests one after another and records their median and 95th percentile
 * time, and their database queries, under `key`. `send` receives the request's index. A status
 * other than `status` fails the benchmark.
 */
const measureRequests = async (options: {
	key: string;
	label: string;
	status: number;
	requests: number;
	send: (request: number) => Promise<MeasuredResponse>;
}): Promise<Record<string, Metric>> => {
	const durations: number[] = [];
	const queries: number[] = [];
	for (let request = 0; request < options.requests; request++) {
		const startedAt = performance.now();
		const response = await options.send(request);
		durations.push(performance.now() - startedAt);

		if (response.status !== options.status) {
			throw new Error(
				`${options.label} gave ${response.status}: ${JSON.stringify(response.body)}`,
			);
		}
		queries.push(countQueries(response));
	}

	return {
		[options.key]: {
			label: options.label,
			unit: "ms",
			value: Number(at(durations, 0.5).toFixed(2)),
		},
		[`${options.key}.p95`]: {
			label: `${options.label} (95th percentile)`,
			unit: "ms",
			value: Number(at(durations, 0.95).toFixed(2)),
		},
		//* exact, unlike timings, so a change in it fails a comparison
		[`${options.key}.queries`]: {
			label: `${options.label} (database queries)`,
			unit: "count",
			value: at(queries, 0.5),
		},
	};
};

export default measureRequests;
