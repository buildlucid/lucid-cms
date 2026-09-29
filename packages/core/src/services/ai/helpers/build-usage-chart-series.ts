import type { LucidAiGenerations } from "../../../libs/db/tables/index.js";
import type { Select } from "../../../libs/db/types.js";
import type {
	AiUsageChart,
	AiUsageChartMetric,
} from "../../../types/response.js";
import { addDays, getDateKey, parseStoredTimestamp } from "./date-helpers.js";

export type AiUsageChartRow = Pick<
	Select<LucidAiGenerations>,
	"created_at" | "session_type" | "session_id" | "credits" | "total_tokens"
>;

const metricValues = {
	requests: () => 1,
	credits: (row) => row.credits ?? 0,
	totalTokens: (row) => row.total_tokens ?? 0,
} satisfies Record<AiUsageChartMetric, (row: AiUsageChartRow) => number>;

/**
 * Buckets charged requests into daily series, filling missing dates with
 * zeroes so the chart stays stable, and totals the whole range.
 */
const buildUsageChartSeries = (props: {
	rows: AiUsageChartRow[];
	metrics: AiUsageChartMetric[];
	start: Date;
	end: Date;
}): Pick<AiUsageChart, "series" | "totals"> => {
	const dates: string[] = [];
	for (let cursor = props.start; cursor <= props.end; ) {
		dates.push(getDateKey(cursor));
		cursor = addDays(cursor, 1);
	}

	const points = new Map(
		props.metrics.map((metric) => [
			metric,
			new Map(dates.map((date) => [date, 0])),
		]),
	);
	const sessions = new Set<string>();
	const totals = { credits: 0, totalTokens: 0, requests: 0, sessions: 0 };

	for (const row of props.rows) {
		const createdAt = parseStoredTimestamp(row.created_at);
		if (Number.isNaN(createdAt.getTime())) continue;

		const date = getDateKey(createdAt);
		if (!dates.includes(date)) continue;

		for (const [metric, series] of points) {
			series.set(date, (series.get(date) ?? 0) + metricValues[metric](row));
		}

		sessions.add(`${row.session_type}:${row.session_id}`);
		totals.credits += metricValues.credits(row);
		totals.totalTokens += metricValues.totalTokens(row);
		totals.requests += 1;
	}
	totals.sessions = sessions.size;

	return {
		series: Array.from(points, ([metric, series]) => ({
			metric,
			points: Array.from(series, ([date, value]) => ({ date, value })),
		})),
		totals,
	};
};

export default buildUsageChartSeries;
