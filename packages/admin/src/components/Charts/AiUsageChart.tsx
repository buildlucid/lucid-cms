import type { AiUsageChartMetric } from "@types";
import type { ChartData, ChartOptions } from "chart.js";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { LineChart } from "@/components/Groups/Charts";
import { Input } from "@/components/Groups/Form/Input";
import { Select } from "@/components/Groups/Form/Select";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import themeStore from "@/store/themeStore";
import T from "@/translations";
import {
	formatAiUsageChartValue,
	getAiUsageChartMetricLabel,
	getAiUsageChartMetricOptions,
	getAiUsageFeatureOptions,
	getDefaultAiUsageChartDates,
	isAiUsageChartMetric,
} from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";

const defaultMetric: AiUsageChartMetric = "totalTokens";
const allFeaturesValue = "__all-features";

const getMetricAxis = (metric: AiUsageChartMetric) =>
	metric === "cost" ? "cost" : "count";

const readThemeVariable = (name: string, fallback: string) => {
	if (typeof document === "undefined") return fallback;
	return (
		getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
		fallback
	);
};

export const AiUsageChart: Component = () => {
	// ----------------------------------
	// Hooks & State
	const defaultDates = getDefaultAiUsageChartDates();
	const [metric, setMetric] = createSignal<AiUsageChartMetric>(defaultMetric);
	const [featureKey, setFeatureKey] = createSignal<string>(allFeaturesValue);
	const [startDate, setStartDate] = createSignal(defaultDates.startDate);
	const [endDate, setEndDate] = createSignal(defaultDates.endDate);

	// ----------------------------------
	// Memos
	const metricOptions = createMemo(() => getAiUsageChartMetricOptions());
	const featureOptions = createMemo(() => [
		{
			value: allFeaturesValue,
			label: T()("common.all"),
		},
		...getAiUsageFeatureOptions(),
	]);
	const selectedFeatureKey = createMemo(() =>
		featureKey() === allFeaturesValue ? undefined : featureKey(),
	);

	// ----------------------------------
	// Queries
	const usageChart = api.ai.useGetUsageChart({
		queryParams: {
			dimension: () => "day",
			metrics: () => [metric()],
			startDate,
			endDate,
			featureKey: selectedFeatureKey,
		},
		enabled: () =>
			startDate().length > 0 && endDate().length > 0 && metric().length > 0,
	});

	const chartSeries = createMemo(() => usageChart.data?.data.series ?? []);
	const hasCostMetric = createMemo(() =>
		chartSeries().some((series) => series.metric === "cost"),
	);
	const hasCountMetric = createMemo(() =>
		chartSeries().some((series) => series.metric !== "cost"),
	);
	const chartPalette = createMemo(() => {
		themeStore.resolved();

		const requests = readThemeVariable("--lucid-chart-requests", "#79A7FF");
		const totalTokens = readThemeVariable(
			"--lucid-primary-base",
			"oklch(88.842% 0.20897 135.866)",
		);
		const cost = readThemeVariable("--lucid-chart-cost", "#F8C45A");

		return {
			border: readThemeVariable("--lucid-border", "rgba(255, 255, 255, 0.1)"),
			body: readThemeVariable("--lucid-body", "#A1A1A1"),
			grid: readThemeVariable(
				"--lucid-chart-grid",
				"rgba(255, 255, 255, 0.06)",
			),
			metrics: {
				requests: {
					backgroundColor: readThemeVariable(
						"--lucid-chart-requests-fill",
						"rgba(121, 167, 255, 0.12)",
					),
					borderColor: requests,
					pointBackgroundColor: requests,
				},
				totalTokens: {
					backgroundColor: readThemeVariable(
						"--lucid-chart-total-fill",
						"rgba(193, 254, 119, 0.12)",
					),
					borderColor: totalTokens,
					pointBackgroundColor: totalTokens,
				},
				cost: {
					backgroundColor: readThemeVariable(
						"--lucid-chart-cost-fill",
						"rgba(248, 196, 90, 0.12)",
					),
					borderColor: cost,
					pointBackgroundColor: cost,
				},
			} satisfies Record<
				AiUsageChartMetric,
				{
					backgroundColor: string;
					borderColor: string;
					pointBackgroundColor: string;
				}
			>,
			pointBorder: readThemeVariable("--lucid-chart-point-border", "#0A0A0A"),
			subtitle: readThemeVariable("--lucid-subtitle", "#C9C9C9"),
			title: readThemeVariable("--lucid-title", "#F1F1F1"),
			tooltip: readThemeVariable("--lucid-chart-tooltip", "#121212"),
		};
	});
	const chartData = createMemo<ChartData<"line">>(() => {
		const firstSeries = chartSeries()[0];
		const palette = chartPalette();

		return {
			labels:
				firstSeries?.points.map(
					(point) =>
						dateHelpers.formatDate(point.date, {
							localDateOnly: true,
						}) ?? point.date,
				) ?? [],
			datasets: chartSeries().map((series) => {
				const style = palette.metrics[series.metric];

				return {
					label: getAiUsageChartMetricLabel(series.metric),
					data: series.points.map((point) => point.value),
					borderColor: style.borderColor,
					backgroundColor: style.backgroundColor,
					pointBackgroundColor: style.pointBackgroundColor,
					pointBorderColor: palette.pointBorder,
					pointHoverRadius: 5,
					pointRadius: 3,
					borderWidth: 2,
					tension: 0.35,
					fill: chartSeries().length === 1,
					yAxisID: getMetricAxis(series.metric),
				};
			}),
		};
	});
	const chartOptions = createMemo<ChartOptions<"line">>(() => ({
		responsive: true,
		maintainAspectRatio: false,
		animation: {
			duration: 700,
			easing: "easeOutQuart",
		},
		interaction: {
			intersect: false,
			mode: "index",
		},
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				backgroundColor: chartPalette().tooltip,
				borderColor: chartPalette().border,
				borderWidth: 1,
				titleColor: chartPalette().title,
				bodyColor: chartPalette().subtitle,
				displayColors: true,
				callbacks: {
					label: (context) => {
						const series = chartSeries()[context.datasetIndex];
						const metric = series?.metric ?? defaultMetric;
						const value =
							formatAiUsageChartValue({
								metric,
								value: context.parsed.y ?? 0,
							}) ?? "0";

						return `${getAiUsageChartMetricLabel(metric)}: ${value}`;
					},
				},
			},
		},
		scales: {
			x: {
				grid: {
					color: chartPalette().grid,
				},
				ticks: {
					color: chartPalette().body,
					maxRotation: 0,
				},
			},
			count: {
				display: hasCountMetric(),
				beginAtZero: true,
				position: "left",
				grid: {
					color: chartPalette().grid,
				},
				ticks: {
					color: chartPalette().body,
					callback: (value) =>
						formatAiUsageChartValue({
							metric: "totalTokens",
							value: Number(value),
						}) ?? "0",
				},
			},
			cost: {
				display: hasCostMetric(),
				beginAtZero: true,
				position: hasCountMetric() ? "right" : "left",
				grid: {
					color: chartPalette().grid,
					drawOnChartArea: !hasCountMetric(),
				},
				ticks: {
					color: chartPalette().body,
					callback: (value) =>
						formatAiUsageChartValue({
							metric: "cost",
							value: Number(value),
						}) ?? "0",
				},
			},
		},
	}));

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-1 gap-3 md:grid-cols-4">
				<Select
					id="ai-usage-chart-metric"
					value={metric()}
					onChange={(value) => {
						if (isAiUsageChartMetric(value)) {
							setMetric(value);
						}
					}}
					name="ai-usage-chart-metric"
					options={metricOptions()}
					copy={{
						label: T()("ai.usage.charts.metric"),
					}}
					noMargin={true}
					noClear={true}
					hideOptionalText={true}
				/>
				<Select
					id="ai-usage-chart-feature"
					value={featureKey()}
					onChange={(value) => {
						setFeatureKey(
							typeof value === "string" && value.length > 0
								? value
								: allFeaturesValue,
						);
					}}
					name="ai-usage-chart-feature"
					options={featureOptions()}
					copy={{
						label: T()("ai.usage.feature"),
					}}
					noMargin={true}
					hideOptionalText={true}
				/>
				<Input
					id="ai-usage-chart-start-date"
					value={startDate()}
					onChange={setStartDate}
					type="date"
					name="ai-usage-chart-start-date"
					copy={{
						label: T()("common.from"),
					}}
					noMargin={true}
					hideOptionalText={true}
				/>
				<Input
					id="ai-usage-chart-end-date"
					value={endDate()}
					onChange={setEndDate}
					type="date"
					name="ai-usage-chart-end-date"
					copy={{
						label: T()("common.to"),
					}}
					noMargin={true}
					hideOptionalText={true}
				/>
			</div>
			<div class="relative h-72 min-h-72">
				<LineChart
					data={chartData()}
					options={chartOptions()}
					class="h-full w-full"
					ariaLabel={T()("ai.usage.charts.title")}
				/>
				<Show when={usageChart.isFetching && !usageChart.data}>
					<div class="absolute inset-0 flex items-center justify-center bg-card-base">
						<Spinner size="sm" />
					</div>
				</Show>
				<Show when={usageChart.isError && !usageChart.data}>
					<div class="absolute inset-0 flex items-center justify-center bg-card-base">
						<p class="text-sm text-body">{T()("ai.usage.charts.error")}</p>
					</div>
				</Show>
			</div>
		</div>
	);
};
