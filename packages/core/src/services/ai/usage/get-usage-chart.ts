import { formatAiUsageFeatureLabel } from "../../../libs/formatters/ai-usage.js";
import { copy } from "../../../libs/i18n/index.js";
import { AiGenerationsRepository } from "../../../libs/repositories/index.js";
import type { GetUsageChartQueryParams } from "../../../schemas/ai.js";
import type { AiUsageChart } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import buildUsageChartSeries from "../helpers/build-usage-chart-series.js";
import { formatDbTimestamp, getDateKey } from "../helpers/date-helpers.js";
import normalizeUsageChartQuery from "../helpers/normalize-usage-chart-query.js";

const getUsageChart: ServiceFn<
	[
		{
			query: GetUsageChartQueryParams;
		},
	],
	AiUsageChart
> = async (context, data) => {
	const query = normalizeUsageChartQuery(data.query);
	if (!query) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.ai.usage.chart.invalid.date.range"),
			},
			data: undefined,
		};
	}

	const AiGenerations = new AiGenerationsRepository(
		context.db.client,
		context.config.db,
	);

	const rowsRes = await AiGenerations.selectUsageChartRows({
		startDate: formatDbTimestamp(query.start),
		endDate: formatDbTimestamp(query.endExclusive),
		featureKey: query.featureKey,
		tenantKey: context.request.tenantKey,
		validation: {
			enabled: true,
		},
	});
	if (rowsRes.error) return rowsRes;

	const chart = buildUsageChartSeries({
		rows: rowsRes.data,
		metrics: query.metrics,
		start: query.start,
		end: query.end,
	});

	return {
		error: undefined,
		data: {
			dimension: query.dimension,
			metrics: query.metrics,
			startDate: getDateKey(query.start),
			endDate: getDateKey(query.end),
			currency: chart.currency,
			feature: query.featureKey
				? {
						key: query.featureKey,
						label: formatAiUsageFeatureLabel({
							featureKey: query.featureKey,
							translate: context.translate,
						}),
					}
				: null,
			series: chart.series,
		},
	};
};

export default getUsageChart;
