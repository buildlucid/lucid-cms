import type { GetUsageChartQueryParams } from "../../../schemas/ai.js";
import type {
	AiUsageChartDimension,
	AiUsageChartMetric,
} from "../../../types/response.js";
import { addDays, getDateKey, parseDateKey } from "./date-helpers.js";

const defaultMetric: AiUsageChartMetric = "totalTokens";
const defaultDimension: AiUsageChartDimension = "day";
const supportedMetrics: AiUsageChartMetric[] = [
	"requests",
	"totalTokens",
	"cost",
];

const isSupportedMetric = (value: string): value is AiUsageChartMetric =>
	supportedMetrics.includes(value as AiUsageChartMetric);

/**
 * Applies usage chart defaults and validates the requested range before the
 * service hits the repository.
 */
const normalizeUsageChartQuery = (query: GetUsageChartQueryParams) => {
	const defaultEnd = parseDateKey(getDateKey(new Date())) as Date;
	const defaultStart = addDays(defaultEnd, -13);
	const end = query.endDate ? parseDateKey(query.endDate) : defaultEnd;
	const start = query.startDate ? parseDateKey(query.startDate) : defaultStart;

	if (!start || !end || start.getTime() > end.getTime()) return null;

	const metrics = (query.metric ?? defaultMetric)
		.split(",")
		.map((metric) => metric.trim())
		.filter(isSupportedMetric);
	const uniqueMetrics =
		metrics.length > 0 ? Array.from(new Set(metrics)) : [defaultMetric];

	return {
		dimension: query.dimension ?? defaultDimension,
		metrics: uniqueMetrics,
		start,
		end,
		endExclusive: addDays(end, 1),
		featureKey: query["filter[featureKey]"]?.trim() || undefined,
	};
};

export default normalizeUsageChartQuery;
