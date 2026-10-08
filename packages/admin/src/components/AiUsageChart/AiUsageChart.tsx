import type { AiUsageChartMetric } from "@types";
import type { ChartData, ChartOptions } from "chart.js";
import { TbOutlineX } from "solid-icons/tb";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import AiUsageStats, {
	type AiUsageStat,
} from "@/components/AiUsageStats/AiUsageStats";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Input from "@/components/Input/Input";
import { LineChart } from "@/components/LineChart/LineChart";
import Select from "@/components/Select/Select";
import Spinner from "@/components/Spinner/Spinner";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import UserSelectDrawer from "@/components/UserSelectDrawer/UserSelectDrawer";
import api from "@/services/api";
import themeStore from "@/store/themeStore/themeStore";
import T from "@/translations";
import {
	formatAiCredits,
	formatAiUsageChartValue,
	formatAiUsageNumber,
	getAiUsageChartMetricLabel,
	getAiUsageChartMetricOptions,
	getAiUsageFeatureOptions,
	getDefaultAiUsageChartDates,
	isAiUsageChartMetric,
} from "@/utils/ai-usage";
import dateHelpers from "@/utils/date-helpers";
import helpers from "@/utils/helpers";
import type { UserRelationRef } from "@/utils/relation-field-helpers";

const defaultMetric: AiUsageChartMetric = "credits";
const allFeaturesValue = "__all-features";

const getMetricAxis = (metric: AiUsageChartMetric) =>
	metric === "credits" ? "credits" : "count";

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
	const [user, setUser] = createSignal<UserRelationRef>();
	const [userPickerOpen, setUserPickerOpen] = createSignal(false);

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
			userId: () => user()?.id,
		},
		enabled: () =>
			startDate().length > 0 && endDate().length > 0 && metric().length > 0,
	});

	const selectedUsers = createMemo(() => {
		const selected = user();
		return selected ? [selected] : [];
	});
	const chartSeries = createMemo(() => usageChart.data?.data.series ?? []);
	const hasCreditsMetric = createMemo(() =>
		chartSeries().some((series) => series.metric === "credits"),
	);
	const hasCountMetric = createMemo(() =>
		chartSeries().some((series) => series.metric !== "credits"),
	);
	const chartPalette = createMemo(() => {
		themeStore.resolved();

		const requests = readThemeVariable("--lucid-chart-requests", "#79A7FF");
		const totalTokens = readThemeVariable(
			"--lucid-primary",
			"oklch(88.842% 0.20897 135.866)",
		);
		const credits = readThemeVariable("--lucid-chart-cost", "#F8C45A");

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
				credits: {
					backgroundColor: readThemeVariable(
						"--lucid-chart-cost-fill",
						"rgba(248, 196, 90, 0.12)",
					),
					borderColor: credits,
					pointBackgroundColor: credits,
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
	const stats = createMemo<AiUsageStat[]>(() => {
		const totals = usageChart.data?.data.totals;
		const accent = (statMetric: AiUsageChartMetric) =>
			statMetric === metric()
				? chartPalette().metrics[statMetric].borderColor
				: undefined;

		return [
			{
				label: T()("ai.usage.credits"),
				value: formatAiCredits(totals?.credits),
				accent: accent("credits"),
			},
			{
				label: T()("ai.usage.metrics.totalTokens"),
				value: formatAiUsageNumber(totals?.totalTokens),
				accent: accent("totalTokens"),
			},
			{
				label: T()("ai.usage.requests"),
				value: formatAiUsageNumber(totals?.requests),
				accent: accent("requests"),
			},
			{
				label: T()("ai.usage.sessions"),
				value: formatAiUsageNumber(totals?.sessions),
			},
		];
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
			credits: {
				display: hasCreditsMetric(),
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
							metric: "credits",
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
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
					label={T()("ai.usage.charts.metric")}
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
					label={T()("ai.usage.feature")}
					clearable={true}
				/>
				<div>
					<FormLabel
						id="ai-usage-chart-user"
						label={T()("common.user")}
						theme="basic"
					/>
					<div class="relative">
						<button
							type="button"
							id="ai-usage-chart-user"
							class="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-input py-2 pl-3 pr-8 text-left text-sm transition-colors duration-200 focus:border-primary focus:outline-hidden"
							onClick={() => setUserPickerOpen(true)}
							aria-haspopup="dialog"
							aria-expanded={userPickerOpen()}
						>
							<Show when={user()}>
								{(selected) => (
									<UserDisplay user={selected()} variant="icon" size="xs" />
								)}
							</Show>
							<Show
								when={user()}
								fallback={
									<span class="truncate text-muted">
										{T()("ai.usage.charts.users.all")}
									</span>
								}
							>
								{(selected) => (
									<span class="truncate text-title">
										{helpers.formatUserName(selected(), "name")}
									</span>
								)}
							</Show>
						</button>
						<Show when={user()}>
							<button
								type="button"
								class="absolute right-2 top-1/2 -translate-y-1/2 text-subtitle transition-colors duration-200 hover:text-danger"
								onClick={() => setUser(undefined)}
								aria-label={T()("common.clear")}
								title={T()("common.clear")}
							>
								<TbOutlineX size={14} />
							</button>
						</Show>
					</div>
					<UserSelectDrawer
						state={{
							open: userPickerOpen(),
							setOpen: setUserPickerOpen,
							multiple: false,
							selected: selectedUsers().map((selected) => selected.id),
							selectedRefs: selectedUsers(),
						}}
						callbacks={{
							onSelect: (selection) => {
								setUser(
									selection.refs.find((ref) => ref.id === selection.value[0]),
								);
							},
						}}
					/>
				</div>
				<Input
					id="ai-usage-chart-start-date"
					value={startDate()}
					onChange={setStartDate}
					type="date"
					name="ai-usage-chart-start-date"
					label={T()("common.from")}
				/>
				<Input
					id="ai-usage-chart-end-date"
					value={endDate()}
					onChange={setEndDate}
					type="date"
					name="ai-usage-chart-end-date"
					label={T()("common.to")}
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
					<div class="absolute inset-0 flex items-center justify-center bg-card">
						<Spinner size="sm" />
					</div>
				</Show>
				<Show when={usageChart.isError && !usageChart.data}>
					<div class="absolute inset-0 flex items-center justify-center bg-card">
						<p class="text-sm text-body">{T()("ai.usage.charts.error")}</p>
					</div>
				</Show>
			</div>
			<AiUsageStats stats={stats()} />
		</div>
	);
};
