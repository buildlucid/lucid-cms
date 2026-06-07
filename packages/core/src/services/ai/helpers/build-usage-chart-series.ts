import type { AiUsageChartRowPropT } from "../../../libs/repositories/index.js";
import type { AiUsageChartMetric } from "../../../types/response.js";
import { getNumber, getObject } from "../../../utils/helpers/index.js";
import { addDays, getDateKey, parseStoredTimestamp } from "./date-helpers.js";

const buildInitialPoints = (start: Date, end: Date) => {
	const points = new Map<string, number>();
	let cursor = new Date(start);

	while (cursor.getTime() <= end.getTime()) {
		points.set(getDateKey(cursor), 0);
		cursor = addDays(cursor, 1);
	}

	return points;
};

const getMetricValue = (
	row: AiUsageChartRowPropT,
	metric: AiUsageChartMetric,
) => {
	switch (metric) {
		case "requests":
			return 1;
		case "cost":
			return row.cost_total_minor ?? 0;
		default: {
			const usage = getObject(row.usage);
			const tokens = getObject(usage?.tokens);
			return getNumber(tokens?.total) ?? 0;
		}
	}
};

/**
 * Buckets raw AI usage rows into complete daily chart series, filling missing
 * dates with zeroes so the frontend can render a stable line chart.
 */
const buildUsageChartSeries = (props: {
	rows: AiUsageChartRowPropT[];
	metrics: AiUsageChartMetric[];
	start: Date;
	end: Date;
}) => {
	const pointMaps = new Map(
		props.metrics.map((metric) => [
			metric,
			buildInitialPoints(props.start, props.end),
		]),
	);
	const firstPointMap = pointMaps.get(props.metrics[0] ?? "totalTokens");
	let currency: string | null = null;

	for (const row of props.rows) {
		const createdAt = parseStoredTimestamp(row.created_at);
		if (Number.isNaN(createdAt.getTime())) continue;

		const dateKey = getDateKey(createdAt);
		if (!firstPointMap?.has(dateKey)) continue;

		if (!currency && row.cost_currency) {
			currency = row.cost_currency;
		}

		for (const metric of props.metrics) {
			const pointMap = pointMaps.get(metric);
			if (!pointMap) continue;

			pointMap.set(
				dateKey,
				(pointMap.get(dateKey) ?? 0) + getMetricValue(row, metric),
			);
		}
	}

	return {
		currency,
		series: props.metrics.map((metric) => ({
			metric,
			points: Array.from(
				(
					pointMaps.get(metric) ?? buildInitialPoints(props.start, props.end)
				).entries(),
			).map(([date, value]) => ({
				date,
				value,
			})),
		})),
	};
};

export default buildUsageChartSeries;
