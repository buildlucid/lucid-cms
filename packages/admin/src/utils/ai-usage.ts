import type {
	AiUsageChartMetric,
	AiUsageMeasure,
	AiUsageSessionType,
} from "@types";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const numberFormatter = new Intl.NumberFormat();
const creditsFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
});

const aiUsageChartMetrics = [
	"credits",
	"totalTokens",
	"requests",
] as const satisfies AiUsageChartMetric[];

const aiUsageSessionTypes = [
	"agent",
	"media-image",
	"media-alt",
	"custom-field",
] as const satisfies AiUsageSessionType[];

export const formatAiUsageNumber = (value?: number | null) => {
	if (value === undefined || value === null) return undefined;
	return numberFormatter.format(value);
};

export const formatAiCredits = (value?: number | null) => {
	if (value === undefined || value === null) return undefined;
	return T()("ai.usage.credits.value", {
		value: creditsFormatter.format(value),
	});
};

export const getAiUsageFeatureOptions = () => [
	{
		value: "agent.chat",
		label: T()("ai.usage.features.agent.chat"),
	},
	{
		value: "agent.compact",
		label: T()("ai.usage.features.agent.compact"),
	},
	{
		value: "agent.title.generate",
		label: T()("ai.usage.features.agent.title.generate"),
	},
	{
		value: "web.search",
		label: T()("ai.usage.features.web.search"),
	},
	{
		value: "web.fetch",
		label: T()("ai.usage.features.web.fetch"),
	},
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

export const getAiUsageFeatureLabel = (key: string) =>
	getAiUsageFeatureOptions().find((option) => option.value === key)?.label ??
	key;

export const getAiUsageSessionTypeOptions = () =>
	aiUsageSessionTypes.map((type) => ({
		value: type,
		label: getAiUsageSessionTypeLabel(type),
	}));

export const getAiUsageSessionTypeLabel = (type: AiUsageSessionType) =>
	T()(`ai.usage.session.types.${type}`);

export const isAiUsageSessionType = (
	value: unknown,
): value is AiUsageSessionType =>
	typeof value === "string" &&
	aiUsageSessionTypes.includes(value as AiUsageSessionType);

export const aiUsageSessionParam = (session: {
	type: AiUsageSessionType;
	id: string;
}) => `${session.type}:${session.id}`;

export const aiUsageSessionHref = (session: {
	type: AiUsageSessionType;
	id: string;
}) =>
	`/lucid/system/ai-usage?session=${encodeURIComponent(aiUsageSessionParam(session))}`;

/** Call inside a reactive scope. */
export const canViewAiUsage = () =>
	userStore.get.hasPermission([Permissions.SettingsRead]).all &&
	siteStore.get.hasAnyAiFeatureEnabled();

export const parseAiUsageSessionParam = (value?: string) => {
	if (!value) return undefined;
	const separator = value.indexOf(":");
	const type = value.slice(0, separator);
	const id = value.slice(separator + 1);
	if (separator === -1 || !isAiUsageSessionType(type) || !id) {
		return undefined;
	}
	return { type, id };
};

export const formatAiUsageMeasure = (usage: AiUsageMeasure | null) => {
	if (!usage) return undefined;
	if (usage.kind === "web") {
		return T()(`ai.usage.web.${usage.operation}.count`, {
			count: usage.requests,
		});
	}
	return T()("ai.usage.tokens.value", {
		value: formatAiUsageNumber(usage.tokens.total),
	});
};

export const getAiUsageChartMetricOptions = () =>
	aiUsageChartMetrics.map((metric) => ({
		value: metric,
		label: getAiUsageChartMetricLabel(metric),
	}));

export const isAiUsageChartMetric = (
	value: unknown,
): value is AiUsageChartMetric =>
	typeof value === "string" &&
	aiUsageChartMetrics.includes(value as AiUsageChartMetric);

export const getAiUsageChartMetricLabel = (metric: AiUsageChartMetric) =>
	T()(`ai.usage.metrics.${metric}`);

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
}) =>
	props.metric === "credits"
		? formatAiCredits(props.value)
		: formatAiUsageNumber(props.value);
