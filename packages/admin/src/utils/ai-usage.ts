import type { AiUsageChartMetric } from "@types";
import T from "@/translations";
import formatAiCost from "./format-ai-cost";

const numberFormatter = new Intl.NumberFormat();
const aiUsageChartMetrics = [
	"requests",
	"totalTokens",
	"cost",
] as const satisfies AiUsageChartMetric[];

export const formatAiUsageNumber = (value?: number | null) => {
	if (value === undefined || value === null) return undefined;
	return numberFormatter.format(value);
};

export const formatAiUsageDuration = (durationMs?: number | null) => {
	if (durationMs === undefined || durationMs === null) return undefined;
	if (durationMs < 1000) return `${durationMs}ms`;

	const seconds = Math.round(durationMs / 1000);
	if (seconds < 60) return `${seconds}s`;

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}h ${remainingMinutes}m ${seconds % 60}s`;
};

export const getAiUsageFeatureOptions = () => [
	{
		value: "custom-field.input.generate",
		label: T()("ai.usage.features.custom.field.input.generate"),
	},
	{
		value: "media.alt.generate",
		label: T()("ai.usage.features.media.alt.generate"),
	},
	{
		value: "media.image.generate",
		label: T()("ai.usage.features.media.image.generate"),
	},
];

export const getAiUsageChartMetricOptions = () => [
	{
		value: "requests" satisfies AiUsageChartMetric,
		label: T()("ai.usage.metrics.requests"),
	},
	{
		value: "totalTokens" satisfies AiUsageChartMetric,
		label: T()("ai.usage.metrics.total.tokens"),
	},
	{
		value: "cost" satisfies AiUsageChartMetric,
		label: T()("ai.usage.cost"),
	},
];

export const isAiUsageChartMetric = (
	value: unknown,
): value is AiUsageChartMetric =>
	typeof value === "string" &&
	aiUsageChartMetrics.includes(value as AiUsageChartMetric);

export const getAiUsageChartMetricLabel = (metric: AiUsageChartMetric) =>
	getAiUsageChartMetricOptions().find((option) => option.value === metric)
		?.label ?? metric;

export const getDefaultAiUsageChartDates = () => {
	const end = new Date();
	const start = new Date(end);
	start.setDate(start.getDate() - 13);

	return {
		startDate: start.toISOString().slice(0, 10),
		endDate: end.toISOString().slice(0, 10),
	};
};

export const formatAiUsageChartValue = (props: {
	metric: AiUsageChartMetric;
	value: number;
	currency?: string | null;
}) => {
	if (props.metric === "cost") {
		if (props.currency) {
			return formatAiCost({
				currency: props.currency,
				totalCostMinor: props.value,
			});
		}
		return `${(props.value / 100).toFixed(2)}`;
	}

	return formatAiUsageNumber(props.value);
};
