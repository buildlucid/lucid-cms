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

const creditPattern = /^(0|[1-9]\d*)(\.\d+)?$/;

const addCreditDecimals = (left: string, right: string) => {
	if (!creditPattern.test(left) || !creditPattern.test(right)) return left;
	const [leftWhole = "0", leftFraction = ""] = left.split(".");
	const [rightWhole = "0", rightFraction = ""] = right.split(".");
	const scale = Math.max(leftFraction.length, rightFraction.length);
	const leftValue = BigInt(`${leftWhole}${leftFraction.padEnd(scale, "0")}`);
	const rightValue = BigInt(`${rightWhole}${rightFraction.padEnd(scale, "0")}`);
	const total = (leftValue + rightValue).toString().padStart(scale + 1, "0");
	if (scale === 0) return total;
	return `${total.slice(0, -scale)}.${total.slice(-scale)}`.replace(
		/\.?0+$/,
		"",
	);
};

const getMetricValue = (
	row: AiUsageChartRowPropT,
	metric: AiUsageChartMetric,
) => {
	switch (metric) {
		case "requests":
			return 1;
		case "cost":
			return 0;
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
	const costPoints = props.metrics.includes("cost")
		? new Map(
				Array.from(buildInitialPoints(props.start, props.end).keys()).map(
					(date) => [date, "0"],
				),
			)
		: undefined;
	const firstPointMap = pointMaps.get(props.metrics[0] ?? "totalTokens");
	for (const row of props.rows) {
		const createdAt = parseStoredTimestamp(row.created_at);
		if (Number.isNaN(createdAt.getTime())) continue;

		const dateKey = getDateKey(createdAt);
		if (!firstPointMap?.has(dateKey)) continue;

		for (const metric of props.metrics) {
			if (metric === "cost") {
				if (row.credits_charged !== null && costPoints?.has(dateKey)) {
					costPoints.set(
						dateKey,
						addCreditDecimals(
							costPoints.get(dateKey) ?? "0",
							row.credits_charged,
						),
					);
				}
				continue;
			}
			const pointMap = pointMaps.get(metric);
			if (!pointMap) continue;

			pointMap.set(
				dateKey,
				(pointMap.get(dateKey) ?? 0) + getMetricValue(row, metric),
			);
		}
	}

	return {
		series: props.metrics.map((metric) => {
			const entries: [string, string | number][] =
				metric === "cost"
					? [...(costPoints ?? new Map<string, string>()).entries()]
					: [
							...(
								pointMaps.get(metric) ??
								buildInitialPoints(props.start, props.end)
							).entries(),
						];

			return {
				metric,
				points: entries.map(([date, value]) => ({
					date,
					value: typeof value === "string" ? Number(value) : value,
				})),
			};
		}),
	};
};

export default buildUsageChartSeries;
